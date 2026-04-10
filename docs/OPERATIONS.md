# bury.lol — Operations

Runbooks, secret rotation, backfills, and moderation procedures.

---

## Incident runbooks

### Stripe webhook is not firing

**Symptoms:** Graves are not appearing in the pending queue after successful payments.

**Steps:**
1. Check Stripe Dashboard → Developers → Webhooks → `<your endpoint>` → recent events.
2. Look for failed deliveries — Stripe retries for 72 hours.
3. Check Vercel function logs: `vercel logs --prod` or Vercel dashboard → Functions → `/api/webhook`.
4. If the endpoint is returning non-2xx, check:
   - `STRIPE_WEBHOOK_SECRET` matches the secret shown in Stripe dashboard for this endpoint.
   - The raw body is being read correctly (`request.text()` — not `request.json()`).
5. To replay a failed event: Stripe Dashboard → Webhooks → select event → "Resend".
6. In local dev, use the Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhook
   stripe trigger checkout.session.completed
   ```

**If webhook is permanently broken:** Graves can be manually inserted via the Supabase SQL editor using the service role. Match the schema exactly. Set `status = 'pending'` so they appear in the admin queue.

---

### Supabase outage

**Symptoms:** Homepage shows no graves; API routes return 500; admin dashboard fails to load.

**Steps:**
1. Check [status.supabase.com](https://status.supabase.com) for active incidents.
2. Vercel's ISR cache (60s revalidation) means the homepage and graveyard continue serving stale content from the edge during an outage — users see the last cached snapshot.
3. `/api/checkout` will fail (rate limit check hits Upstash, which works, but the Stripe session creation itself doesn't touch Supabase — checkouts can proceed). Webhooks will fail to insert.
4. Once Supabase recovers, Stripe will retry failed webhook deliveries automatically (up to 72h).
5. If events are older than 72h and were missed: check Stripe Dashboard → Events → filter by `checkout.session.completed` → replay manually.

**Stats drift:** If the outage caused missed trigger fires, backfill stats (see below).

---

### Upstash Redis outage

**Symptoms:** `/api/checkout` returns 500; `/api/report` returns 500.

**Steps:**
1. Check [upstash.com/status](https://upstash.com/status).
2. Rate limiting is the only Upstash dependency. If Redis is unavailable, `checkoutRateLimit.limit()` throws.
3. **Temporary mitigation:** Comment out the rate limit check in `/api/checkout` and deploy — this removes abuse protection but restores checkout functionality. Revert immediately once Redis recovers.
4. `/api/report` similarly — the report action is non-critical; users get a 500 instead of a confirmation.

---

### Admin dashboard is inaccessible

**Symptoms:** `/admin` redirects to `/admin/login` even with the correct password, or login always fails.

**Steps:**
1. Verify `ADMIN_PASSWORD` is set in Vercel environment variables (not just `.env.local`).
2. Check that the cookie `admin_token` is being set: open DevTools → Application → Cookies → look for `admin_token` after login.
3. Confirm the cookie is `httpOnly` and `SameSite=Lax` — if it's missing, the login route may be returning an error.
4. Token format is `{expiryMs}:{hmacHex}`. If `ADMIN_PASSWORD` was rotated (see below), existing tokens are immediately invalidated — log in again.
5. Check Vercel function logs for `/api/admin-login` errors.

---

## Secret rotation

### Rotate `ADMIN_PASSWORD`

1. Generate a new password: `openssl rand -base64 24`
2. Update in Vercel: Dashboard → Project → Settings → Environment Variables → `ADMIN_PASSWORD`.
3. Redeploy (Vercel environment variable changes require a redeploy to take effect).
4. All existing admin session cookies are immediately invalidated — log in again.
5. Update your local `.env.local` to match.

### Rotate `STRIPE_WEBHOOK_SECRET`

1. In Stripe Dashboard → Developers → Webhooks → select endpoint → "Reveal" or "Roll secret".
2. Update `STRIPE_WEBHOOK_SECRET` in Vercel environment variables.
3. Redeploy.
4. Stripe will continue signing events with the old secret for a short window — this is safe.

### Rotate `STRIPE_SECRET_KEY`

1. In Stripe Dashboard → Developers → API keys → roll or create a new restricted key.
2. Update `STRIPE_SECRET_KEY` in Vercel.
3. Note: `STRIPE_SECRET_KEY` is also used as the HMAC signing key for success tokens. Rotating it invalidates any in-flight `/success?t=` links (24h TTL). Users mid-checkout may see a "processing" fallback — acceptable.
4. Redeploy.

### Rotate `IP_HASH_SALT`

1. Generate: `openssl rand -hex 32`
2. Update in Vercel.
3. **Warning:** Rotating this salt means existing `ip_hash` values in the database no longer match future hashes from the same IP. Historical rate-limit correlation is lost. Only rotate if the salt is believed to be compromised.
4. Redeploy.

### Rotate `SUPABASE_SERVICE_ROLE_KEY`

1. In Supabase Dashboard → Project Settings → API → Service Role → regenerate.
2. Update `SUPABASE_SERVICE_ROLE_KEY` in Vercel.
3. Redeploy immediately — the old key stops working as soon as you regenerate.

---

## Backfill stats counters

The `stats` table is maintained by the `on_grave_approved` trigger. If it drifts (missed trigger fires, manual DB edits, or a Supabase outage), recompute:

```sql
-- Recompute from source of truth
UPDATE stats
SET
  total_approved = (
    SELECT COUNT(*) FROM graves WHERE status = 'approved'
  ),
  total_revenue_cents = (
    SELECT COALESCE(SUM(amount_paid), 0) FROM graves WHERE status = 'approved'
  ),
  last_updated = now()
WHERE id = 1;
```

Run this in the Supabase SQL editor with the service role (default for the editor). Safe to run at any time — it's a single UPDATE, not additive.

---

## Moderation procedures

### Normal review

1. Open `/admin` (requires admin cookie).
2. Pending tab shows graves sorted newest-first.
3. For each: read subject + epitaph + buried_by.
4. **Approve** if: cultural reference, self-deprecating, funny and harmless, affectionate celebrity/brand reference.
5. **Reject** if: targets a real living private individual, contains hate speech, is spam, contains a URL, is clearly gibberish.
6. Rejection reasons are stored — be specific ("targets named individual" not just "inappropriate").

### Reported graves

1. Open `/admin` → Reported tab.
2. Graves with `report_count >= 1` appear here, sorted by report count descending.
3. Reports do not auto-hide — admin makes the call.
4. A grave with 3+ reports from different IPs warrants immediate review.
5. If you reject a grave that users can still permalink to (via `/grave/[shareToken]`): the page will 404 (RLS blocks non-approved reads via anon key) — this is correct behavior.

### Bulk operations (SQL)

To reject all graves matching a pattern (e.g., a spam wave):

```sql
-- Preview first
SELECT id, subject, epitaph FROM graves
WHERE status = 'pending'
AND (subject ILIKE '%spam-pattern%' OR epitaph ILIKE '%spam-pattern%');

-- Then reject
UPDATE graves
SET
  status = 'rejected',
  moderated_at = now(),
  rejection_reason = 'bulk-reject: spam wave YYYY-MM-DD'
WHERE status = 'pending'
AND (subject ILIKE '%spam-pattern%' OR epitaph ILIKE '%spam-pattern%');
```

Run in Supabase SQL editor (service role). The trigger does not fire on `pending → rejected` transitions, so `stats` is unaffected.

### Adding to the keyword blocklist

The blocklist lives in `src/app/api/webhook/route.ts` (`BLOCKLIST` array). To add terms:

1. Edit `BLOCKLIST` in `src/app/api/webhook/route.ts`.
2. Commit, push, deploy.
3. New blocklist only applies to future webhooks — already-pending graves are unaffected.
4. The blocklist uses case-insensitive substring matching (`text.toLowerCase().includes(term)`).

---

## Manually inserting or correcting a grave

If a grave needs to be inserted or corrected outside the normal purchase flow (e.g., seeding, data fix):

```sql
-- Insert a pre-approved grave
INSERT INTO graves (
  subject, epitaph, buried_by, tier, amount_paid,
  stripe_session_id, paid_at, status, moderated_at,
  grid_x, grid_y, share_token, created_at, ip_hash
) VALUES (
  'Subject text',
  'Epitaph text',
  'Buried By Name',
  2,         -- tier
  200,       -- amount_paid in cents
  'manual_001',  -- unique stripe_session_id placeholder
  now(),
  'approved',
  now(),
  6,         -- grid_x (row*10+col)
  0,         -- grid_y (always 0)
  encode(gen_random_bytes(6), 'hex'),
  now(),
  'manual'
);
```

After inserting an approved grave, manually update `stats`:

```sql
UPDATE stats SET
  total_approved = total_approved + 1,
  total_revenue_cents = total_revenue_cents + 200,
  last_updated = now()
WHERE id = 1;
```

(The trigger only fires on UPDATE transitions — it does not fire on INSERT.)

---

## Checking service health

Quick health checks from the terminal:

```bash
# Check Vercel deployment status
vercel ls

# Tail production logs
vercel logs --prod

# Check Stripe webhook deliveries (Stripe CLI)
stripe webhooks list
stripe events list --limit 10

# Check Upstash Redis connectivity
curl "$UPSTASH_REDIS_REST_URL/ping" \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
# Expected: {"result":"PONG"}
```
