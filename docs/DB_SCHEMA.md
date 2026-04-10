# bury.lol — Database Schema

Supabase (Postgres). Schema defined in `supabase/schema.sql`. Run it once in the Supabase SQL editor to set up from scratch.

---

## Tables

### `graves`

One row per purchased grave.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `created_at` | timestamptz | No | `now()` | Insertion time |
| `subject` | text | No | — | What is being buried. Max 50 chars. |
| `epitaph` | text | Yes | — | Optional inscription. Max 80 chars. |
| `buried_by` | text | Yes | `'Anonymous'` | Purchaser name. Max 30 chars. |
| `tier` | integer | No | `2` | 1–4. See tier table below. |
| `stripe_session_id` | text | Yes | — | Unique Stripe Checkout session ID. |
| `amount_paid` | integer | No | — | In cents (e.g. 200 = $2). |
| `paid_at` | timestamptz | Yes | — | When payment was confirmed by webhook. |
| `status` | text | No | `'pending'` | Lifecycle state. See below. |
| `moderated_at` | timestamptz | Yes | — | When admin approved or rejected. |
| `rejection_reason` | text | Yes | — | Admin-entered reason if rejected. |
| `grid_x` | integer | Yes | — | Canonical position: `row * 10 + col`. Null for mausoleums and pending/rejected graves. |
| `grid_y` | integer | Yes | — | Always `0` for positioned graves. Null for mausoleums. |
| `ip_hash` | text | Yes | — | SHA-256(ip + IP_HASH_SALT), first 16 hex chars. Raw IP never stored. |
| `share_token` | text | Yes | `encode(gen_random_bytes(6), 'hex')` | Unique 12-char hex permalink token. |
| `report_count` | integer | No | `0` | Incremented by `/api/report`. Surfaces in admin at ≥ 3. |
| `icon` | text | Yes | — | Emoji icon chosen in form (max 8 chars). |
| `visit_count` | integer | No | `0` | Incremented on each `/grave/[shareToken]` page view. |

**Constraints:**
- `status` ∈ `('pending', 'approved', 'rejected')`
- `tier` ∈ `(1, 2, 3, 4)`
- `char_length(subject) <= 50`, `char_length(epitaph) <= 80`, `char_length(buried_by) <= 30`
- `stripe_session_id` unique
- `share_token` unique

---

### `stats`

Single-row materialized counter table. Updated by trigger, not by direct writes.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | integer | `1` | Always 1. Primary key with `CHECK (id = 1)`. |
| `total_approved` | integer | `0` | Count of all approved graves. |
| `total_revenue_cents` | integer | `0` | Sum of `amount_paid` for approved graves. |
| `last_updated` | timestamptz | `now()` | Updated whenever the trigger fires. |

---

## Grave lifecycle

```
[purchased]
     │
     ▼
  pending          ← written by /api/webhook on checkout.session.completed
     │
     ├──(approve)──▶  approved  ← grid position assigned; visible on canvas
     │
     └──(reject)───▶  rejected  ← stored for audit; never shown publicly
```

State transitions happen only via `POST /api/approve` (admin-only). The `update_stats` trigger fires on every `pending → approved` transition.

**Auto-rejection:** The webhook blocklist runs before insert. If subject or epitaph matches a blocked term, the grave is inserted directly as `status: 'rejected'` with `rejection_reason: 'auto-rejected: blocklist'`. It is still written (for audit trail) but never reaches the pending queue.

---

## Tier definitions

| Tier | Price | Name |
|---|---|---|
| 1 | $1 (100 cents) | A shallow grave |
| 2 | $2 (200 cents) | A proper burial |
| 3 | $5 (500 cents) | Deluxe tombstone |
| 4 | $50 (5000 cents) | The Mausoleum |

Tier 4 (Mausoleum) graves are displayed in a dedicated pinned row above the main grid. `grid_x` and `grid_y` are always `NULL` for mausoleums.

---

## Grid encoding

```
grid_x = row * 10 + col   (integer 0–99)
grid_y = 0                  (always; the column is retained for schema compatibility)
```

Decoding: `col = grid_x % 10`, `row = floor(grid_x / 10)`. 10 columns × 10 rows = 100 plots.

See `supabase/migrations/20260410000000_m1_fix_grid_encoding.sql` for the migration that canonicalized this model.

---

## Triggers

### `on_grave_approved` → `update_stats()`

Fires `AFTER UPDATE` on `graves`, `FOR EACH ROW`.

```sql
if NEW.status = 'approved' and OLD.status != 'approved' then
  update stats set
    total_approved = total_approved + 1,
    total_revenue_cents = total_revenue_cents + NEW.amount_paid,
    last_updated = now()
  where id = 1;
end if;
```

Increments `total_approved` and `total_revenue_cents` exactly once per grave approval. Re-approving an already-approved grave does not double-count (condition checks `OLD.status != 'approved'`).

---

## RPCs

Both RPCs are `SECURITY DEFINER` with `SET search_path = public`. `EXECUTE` is revoked from `public` and granted only to `service_role`.

### `increment_visit_count(grave_share_token text)`

Called fire-and-forget by `/grave/[shareToken]` on each page view. Atomically increments `visit_count` for the matching grave.

### `increment_report_count(token text)`

Called by `/api/report`. Atomically increments `report_count` for the matching grave. `/api/report` falls back to a direct UPDATE if the RPC is unavailable.

---

## Row Level Security

| Table | Policy | Effect |
|---|---|---|
| `graves` | `Public can read approved graves` | `SELECT` allowed where `status = 'approved'` |
| `stats` | `Public can read stats` | `SELECT` always allowed |

No public `INSERT`, `UPDATE`, or `DELETE` policies exist. All writes use the service role key in server-side API routes.

---

## Indexes

| Index | Table | Columns | Purpose |
|---|---|---|---|
| `graves_status_idx` | `graves` | `status` | Filter by pending/approved/rejected |
| `graves_position_idx` | `graves` | `grid_x, grid_y` | Collision detection on approval |
| `graves_tier_idx` | `graves` | `tier` | Mausoleum row query |
| `graves_created_idx` | `graves` | `created_at DESC` | Recent graves, stats oldest/newest |
| `graves_visit_count_idx` | `graves` | `visit_count DESC` | Top visited graves on stats page |

---

## Migrations

Applied in order from `supabase/migrations/`:

| File | Description |
|---|---|
| `20260409000000_add_icon_visit_count.sql` | Adds `icon`, `visit_count` columns; adds `increment_visit_count` and `increment_report_count` RPCs |
| `20260409000001_harden_rpcs.sql` | REVOKE execute from public; GRANT to service_role; SET search_path on both RPCs |
| `20260410000000_m1_fix_grid_encoding.sql` | Re-encodes seed data from 2D (gx=col, gy=row_block) to canonical 1D (gx=row×10+col, gy=0) |
