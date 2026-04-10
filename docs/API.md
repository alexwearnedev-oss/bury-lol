# bury.lol — API Reference

All routes are Next.js App Router API routes under `src/app/api/`. All request and response bodies are JSON.

---

## Public routes

### `POST /api/checkout`

Creates a Stripe Checkout session and returns the redirect URL.

**Rate limit:** 5 requests / IP / hour (Upstash Redis sliding window)

**Request body:**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `subject` | string | Yes | 1–50 chars; HTML stripped |
| `epitaph` | string | No | max 80 chars; HTML stripped |
| `buried_by` | string | No | max 30 chars; HTML stripped; default `"Anonymous"` |
| `tier` | integer | Yes | 1, 2, 3, or 4 |
| `icon` | string | No | max 8 chars (emoji) |
| `preferred_x` | integer | No | 0–99 (canonical grid_x = row×10+col) |
| `preferred_y` | integer | No | 0–99 (always 0 in practice) |

**Responses:**

| Status | Body | Meaning |
|---|---|---|
| 200 | `{ url: string }` | Stripe Checkout URL — redirect the user here |
| 400 | `{ error: string }` | Validation failure or invalid JSON |
| 429 | `{ error: "Too many requests" }` | Rate limit exceeded |
| 500 | `{ error: "Failed to create checkout session" }` | Stripe error |

**Notes:**
- Pre-generates a `share_token` (12 hex chars) and embeds it in both Stripe metadata and a signed success token.
- Success URL is `/success?t={signedToken}` — token carries all display data so `/success` renders without a DB query.

---

### `POST /api/report`

Increments the `report_count` on a grave. Does not auto-hide — surfaces grave in admin reported tab at count ≥ 3.

**Rate limit:** 1 request / IP / grave (keyed on `SHA256(ip):shareToken`)

**Request body:**

| Field | Type | Required |
|---|---|---|
| `shareToken` | string | Yes (1–20 chars) |

**Responses:**

| Status | Body | Meaning |
|---|---|---|
| 200 | `{ ok: true }` | Report recorded |
| 400 | `{ error: string }` | Invalid JSON or input |
| 404 | `{ error: "Grave not found" }` | Token does not match any grave (RPC fallback only) |
| 429 | `{ error: "Already reported" }` | This IP has already reported this grave |

**Notes:**
- Calls `increment_report_count` RPC (SECURITY DEFINER, service_role only).
- Falls back to a direct update if the RPC is unavailable.

---

### `POST /api/webhook`

Stripe webhook handler. Receives `checkout.session.completed` events and writes the grave to Supabase.

**Auth:** Stripe signature verification via `stripe.webhooks.constructEvent()`. Requests without a valid `stripe-signature` header are rejected immediately with 400.

**Rate limit:** None (protected by Stripe signature instead).

**Request:** Raw Stripe event body (verified against `STRIPE_WEBHOOK_SECRET`).

**Responses:**

| Status | Body | Meaning |
|---|---|---|
| 200 | `{ received: true }` | Event processed (or intentionally ignored) |
| 400 | `{ error: string }` | Missing signature or invalid signature |
| 400 | `{ error: "Missing metadata" }` | Checkout session missing subject or tier |
| 500 | `{ error: "Database error" }` | Supabase insert failed |

**Behavior on `checkout.session.completed`:**
1. Reads `metadata` from the Stripe session (subject, epitaph, buried_by, tier, icon, share_token, preferred_x, preferred_y).
2. Runs keyword blocklist check — if matched, inserts with `status: 'rejected'` (stored for audit, never shown).
3. Inserts grave with `status: 'pending'` if not blocked.
4. Sends confirmation email via Resend if `session.customer_details.email` exists.
5. Logs a warning if the DB-assigned `share_token` differs from the pre-generated one (permanent link mismatch).

---

## Admin-only routes

All admin routes require a valid `admin_token` cookie (HMAC-SHA256 signed, 7-day expiry). Requests without a valid token are rejected by middleware before reaching the route handler.

---

### `POST /api/admin-login`

Validates the admin password and sets a signed session cookie.

**Auth:** None required (this is the login endpoint).

**Request body:**

| Field | Type | Required |
|---|---|---|
| `password` | string | Yes |

**Responses:**

| Status | Body | Meaning |
|---|---|---|
| 200 | `{ ok: true }` | Login successful; `admin_token` cookie set (httpOnly, SameSite=Lax, 7 days) |
| 401 | `{ error: "Invalid password" }` | Wrong password |
| 400 | `{ error: "Password required" }` | Empty or missing password |

**Notes:**
- Password compared with `timingSafeEqual` (constant-time, prevents timing attacks).
- Returns 401 for empty `ADMIN_PASSWORD` env var (fails closed).

---

### `POST /api/admin-logout`

Clears the admin session cookie.

**Auth:** `admin_token` cookie (not validated — logout always succeeds).

**Request body:** None.

**Response:** `{ ok: true }` with `Set-Cookie: admin_token=; maxAge=0`.

---

### `POST /api/approve`

Approves or rejects a pending grave.

**Auth:** `admin_token` cookie required (validated by middleware).

**Request body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID string | Yes | Grave `id` from Supabase |
| `action` | `"approve"` \| `"reject"` | Yes | |
| `reason` | string | No | Max 200 chars; required context for reject (defaults to `"No reason provided"`) |

**Responses:**

| Status | Body | Meaning |
|---|---|---|
| 200 | `{ ok: true }` | Action applied |
| 400 | `{ error: string }` | Invalid JSON or Zod validation failure |
| 401 | `{ error: "Unauthorized" }` | Invalid or expired admin token (set by middleware) |
| 500 | `{ error: "Failed to approve" \| "Failed to reject" }` | Supabase update failed |

**Approve behavior:**
- Checks if the grave's stored `preferred_x`/`preferred_y` (set by user at checkout) is still free among approved graves.
- If free: uses the preferred position.
- If taken: auto-assigns the first free `grid_x` (0–99, scanning ascending) with `grid_y = 0`.
- Sets `status = 'approved'`, `moderated_at = now()`, and the resolved grid position.
- Overflow (all 100 plots taken): assigns `grid_x = 100` — admin should handle manually.

**Reject behavior:**
- Sets `status = 'rejected'`, `moderated_at = now()`, `rejection_reason = reason`.

---

## Canonical grid encoding

```
grid_x = row * 10 + col   (0–99)
grid_y = 0                  (always)

col = grid_x % 10
row = floor(grid_x / 10)
```

10 columns × 10 rows = 100 plots. Mausoleums (tier 4) are not assigned grid positions.
