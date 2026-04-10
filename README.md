# bury.lol

> A final resting place for things the internet loved and lost.

A viral graveyard where anyone can pay a small fee to plant a pixel tombstone for something culturally dead — an app, trend, meme, era, or personal moment. The graveyard is a single shared isometric canvas that grows over time.

**Stack:** Next.js 14 (App Router) · Supabase · Stripe · Resend · Upstash Redis · Vercel

---

## Product overview

| Page | Purpose |
|---|---|
| `/` | Landing page — stats, recent burials, entry points |
| `/graveyard` | Isometric graveyard canvas (approved graves only) |
| `/bury` | Multi-step purchase form |
| `/success` | Post-Stripe-checkout confirmation + share buttons |
| `/grave/[shareToken]` | Individual grave permalink with OG image |
| `/stats` | Public stats — soul count, revenue, top graves |
| `/admin` | Moderation queue (password-protected) |
| `/admin/login` | Admin login (sets httpOnly session cookie) |

## Grave tiers

| Tier | Price | Name | Canvas size |
|---|---|---|---|
| 1 | $1 | A shallow grave | Standard |
| 2 | $2 | A proper burial | Standard (default) |
| 3 | $5 | Deluxe tombstone | 1.5× |
| 4 | $50 | The Mausoleum | 3×, pinned row, animated border |

---

## Local development

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works)
- A Stripe account (test mode for development)
- A Resend account
- An Upstash Redis database

### Setup

```bash
git clone <repo>
cd bury-lol
npm install
cp .env.example .env.local
# Fill in all env vars — see Environment variables below
npm run dev
```

### Commands

```bash
npm run dev        # Local dev server (http://localhost:3000)
npm run build      # Production build
npm run typecheck  # TypeScript type check
npm run lint       # ESLint
```

---

## Environment variables

All vars are required unless marked optional.

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public, RLS-enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — **server-side only, never expose client-side** |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (from Stripe dashboard) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `RESEND_API_KEY` | Resend API key for confirmation emails |
| `ADMIN_PASSWORD` | Admin dashboard password — used to sign HMAC session tokens |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `NEXT_PUBLIC_BASE_URL` | Full base URL (e.g. `https://bury.lol`) — no trailing slash |
| `IP_HASH_SALT` | Random string for SHA-256 IP hashing — generate with `openssl rand -hex 32` |

---

## Database setup

Run `supabase/schema.sql` once in the Supabase SQL editor. This creates:
- `graves` table with all columns
- `stats` single-row materialized counter table
- `update_stats` trigger (fires on grave approval)
- `increment_visit_count` and `increment_report_count` RPCs (SECURITY DEFINER, service_role only)
- RLS policies (public read of approved graves and stats; no public writes)
- All indexes

To seed the graveyard with 40 pre-approved graves (recommended before launch):

```sql
-- Run in Supabase SQL editor after schema.sql
\i supabase/seed.sql
```

---

## Purchase flow

```
User fills /bury form
  → POST /api/checkout (rate-limited: 5/IP/hour)
      → Zod validation + HTML sanitisation
      → Pre-generate share_token (hex)
      → Build signed success token (HMAC-SHA256, expires 24h)
      → Create Stripe Checkout session
          → success_url: /success?t={signedToken}
          → metadata: subject, epitaph, buried_by, tier, icon, share_token, preferred_x/y
  → Redirect to Stripe hosted payment page

Stripe fires checkout.session.completed
  → POST /api/webhook
      → Verify Stripe signature (reject without it)
      → Keyword blocklist check (auto-reject if matched)
      → Insert grave (status: 'pending') with share_token from metadata
      → Send confirmation email via Resend

User lands on /success?t={signedToken}
  → Server decodes signed token (no DB query needed)
  → Shows tombstone + share buttons

Admin approves at /admin
  → POST /api/approve {id, action: 'approve'}
      → Honour preferred plot if still free, else auto-assign
      → grid_x = row * 10 + col, grid_y = 0
      → status → 'approved', moderated_at = now()
  → Grave appears live via Supabase realtime subscription
```

---

## Moderation workflow

1. New graves arrive at `/admin` with status `pending`.
2. Admin reviews: subject, epitaph, buried_by, tier, IP hash, timestamp.
3. **Approve**: click Approve → grave gets a grid position and goes live immediately.
4. **Reject**: click Reject, enter reason → grave stays hidden; reason stored for audit.
5. **Reported graves**: tab shows `report_count > 0`, sorted descending. Reports don't auto-hide — admin decides.

Auto-rejection happens before the queue: the webhook blocklist rejects graves containing slurs, harassment phrases, or URLs at insert time (status written as `rejected`, not `pending` — still stored for audit trail).

Target: review within 24 hours. At ~50 submissions/day consider expanding the blocklist. At ~200/day consider AI-assisted pre-screening.

---

## Admin authentication

- Password set via `ADMIN_PASSWORD` env var.
- On login, password is compared with `timingSafeEqual` (constant-time).
- On success, a signed `admin_token` cookie is set (HMAC-SHA256, 7-day expiry, httpOnly, SameSite=Lax).
- Token format: `{expiryMs}:{hmacHex}` — signed with `ADMIN_PASSWORD` as key.
- Middleware verifies token on every request to `/admin/*` and `/api/approve`.
- Logout via POST `/api/admin-logout` (sets cookie maxAge=0).

---

## Security model

| Control | Implementation |
|---|---|
| Service role isolation | `SUPABASE_SERVICE_ROLE_KEY` used only in server API routes; anon key used client-side with RLS |
| Stripe webhook verification | `stripe.webhooks.constructEvent()` — rejects any request without valid signature |
| Rate limiting | Upstash Redis sliding window: 5/IP/hour on checkout; 1/IP/grave on report |
| IP hashing | SHA-256 + `IP_HASH_SALT`, first 16 hex chars stored — raw IPs never written |
| Input sanitisation | `sanitize-html` strips all HTML tags before storage; Zod validates schema |
| Admin auth | HMAC-signed cookies, constant-time password compare, 7-day expiry |
| No dangerouslySetInnerHTML | Enforced — all user content rendered via React JSX escaping |
| RPC least-privilege | `increment_visit_count` and `increment_report_count` restricted to service_role; REVOKE from public |
| Content Security Policy | Set via `next.config.js` headers |

---

## Grid model

```
grid_x = row * 10 + col   (integer 0–99)
grid_y = 0                  (always; unused dimension)

Decoding: col = grid_x % 10, row = floor(grid_x / 10)
Grid: 10 columns × 10 rows = 100 fixed plots
```

Mausoleums (tier 4) appear in a dedicated pinned row above the main grid and do not receive a `grid_x`/`grid_y` assignment.

---

## Known caveats

**Font loading:** Fonts (`PressStart2P`, `VT323`) are served from committed WOFF2 files in `/public/fonts/` via `next/font/local`. Do not switch to `next/font/google` — that fetches from `fonts.gstatic.com` at build time and fails in CI without network access.

**Stripe webhook in local dev:** Use the Stripe CLI to forward webhooks:
```bash
stripe listen --forward-to localhost:3000/api/webhook
# Copy the webhook signing secret it prints → STRIPE_WEBHOOK_SECRET in .env.local
```

**Supabase RLS:** The anon key cannot write to any table. All writes go through the service role in API routes. If you see permission errors on reads, check that RLS policies exist (`supabase/schema.sql`).

**Missing env vars:** Next.js will start without throwing on missing env vars — errors appear at runtime. If `/api/checkout` returns 500, check that all Stripe and Upstash vars are set.

---

## Further reading

- [docs/API.md](docs/API.md) — All API routes, payloads, status codes, rate limits
- [docs/DB_SCHEMA.md](docs/DB_SCHEMA.md) — Schema, lifecycle states, trigger behavior
- [docs/OPERATIONS.md](docs/OPERATIONS.md) — Incident runbooks, secret rotation, backfills
- [docs/brief.md](docs/brief.md) — Full product brief (canonical design decisions)
