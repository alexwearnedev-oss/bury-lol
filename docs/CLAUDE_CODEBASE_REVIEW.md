# bury.lol Codebase Review (for Claude Code to Apply)

## Scope of this review
I reviewed the Next.js app, API routes, Supabase schema, and docs for bugs, security issues, maintainability, and product/documentation improvements.

This file is written so you can hand it directly to Claude Code and have it apply changes incrementally.

---

## How Claude Code should execute this plan
1. Create a branch named: `chore/codebase-hardening-and-docs`.
2. Apply **Critical** items first, then **High**, then **Medium**.
3. After each section, run:
   - `npm run typecheck`
   - `npm run lint`
4. For DB changes, generate SQL migration files under `supabase/migrations/` (do not edit historical schema blindly).
5. Update docs last and ensure docs match implementation.

---

## Critical issues (fix first)

### C1) Database schema drift: app expects fields/functions that schema does not define
**Problem**
- App code reads/writes `icon` and `visit_count`, and calls RPCs `increment_visit_count` / `increment_report_count`, but `supabase/schema.sql` does not define them.
- This can cause runtime failures and broken stats/reporting.

**Evidence**
- `src/lib/types.ts` includes `icon` and `visit_count`.
- Queries selecting `icon` / `visit_count`: `src/app/page.tsx`, `src/app/graveyard/page.tsx`, `src/app/grave/[shareToken]/page.tsx`, `src/app/stats/page.tsx`, etc.
- RPC usage: `src/app/grave/[shareToken]/page.tsx`, `src/app/api/report/route.ts`.
- Missing in `supabase/schema.sql`.

**Claude Code fix steps**
1. Add migration adding columns to `graves`:
   - `icon text`
   - `visit_count integer not null default 0`
2. Add SQL functions:
   - `increment_visit_count(grave_share_token text)` (atomic update + return count optional)
   - `increment_report_count(token text)` (atomic update)
3. Add indexes for these access patterns if needed:
   - `share_token` already unique; keep.
   - Optional index on `visit_count desc` for leaderboard query.
4. Update `supabase/schema.sql` so greenfield setup includes same fields/functions.

**Acceptance criteria**
- Grave pages increment views without errors.
- Reporting works via RPC (fallback no longer required but may remain defensive).
- Stats page no longer risks missing column errors.

---

### C2) Admin auth cookie stores raw admin password
**Problem**
- `/api/admin-login` sets `admin_token` cookie to `ADMIN_PASSWORD` itself.
- Middleware auth compares cookie value directly to env password.
- If cookie leaks, admin password is effectively leaked.

**Claude Code fix steps**
1. Replace cookie value with a signed token (HMAC) or random session token.
2. Implement server-side validation in middleware (verify signature + expiry).
3. Keep `httpOnly`, `secure`, `sameSite=lax`, `path=/`.
4. Add short session expiry and optional logout endpoint.

**Acceptance criteria**
- Cookie no longer contains plaintext password.
- Existing admin flow still works.

---

### C3) `/api/grave-by-session` can leak private pending grave data if session id is guessed/leaked
**Problem**
- Endpoint returns grave details for any `session_id` without ownership proof.
- Uses admin client and exposes `share_token` before moderation.

**Claude Code fix steps**
Choose one:
- **Preferred**: remove this endpoint and use a signed short-lived success token issued at checkout completion.
- **Alternative**: require server-verified Stripe session ownership signal (harder in anonymous flow), and only return minimal non-sensitive data.

Minimum hardening if keeping route:
1. Never return `share_token` for pending/unapproved entries.
2. Return generic “processing” unless status is approved.
3. Add tight rate limiting for this route.

---

### C4) JSON parsing robustness in API routes
**Problem**
- Some routes call `request.json()` without try/catch (`/api/report`, `/api/admin-login`, `/api/approve`), so malformed JSON can produce 500s.

**Claude Code fix steps**
1. Wrap `request.json()` in try/catch in all POST routes.
2. Return consistent `{ error: 'Invalid JSON' }` + HTTP 400.
3. Keep zod validation after successful parse.

---

## High-priority issues

### H1) Plot reservation UX blocks on non-approved graves
**Problem**
- `PlotPicker` loads occupied cells from all rows with non-null `grid_x`, not only approved graves.
- Pending/rejected entries with `grid_x` can incorrectly mark plots as unavailable.

**Claude Code fix steps**
- In `src/components/PlotPicker.tsx`, filter with `.eq('status', 'approved')`.

---

### H2) IP extraction for rate-limiting is naive (`x-forwarded-for` may contain CSV)
**Problem**
- Current code uses raw header string, which can be comma-separated chain and inconsistent.

**Claude Code fix steps**
1. Add helper `getClientIp(request)` in `src/lib/`:
   - take first value of `x-forwarded-for` CSV
   - trim spaces
   - fallback to `'unknown'`
2. Reuse helper in `/api/checkout`, `/api/report`, `/api/webhook`.

---

### H3) Lint fails due to unused variable in `GraveyardCanvas`
**Problem**
- `maxRow` is computed and unused, failing CI lint.

**Claude Code fix steps**
- Remove `maxRow` from memo return and related variable or actually use it intentionally.

---

### H4) Build fragility due to remote Google font fetch during build
**Problem**
- `next/font/google` fetch can fail in restricted environments.

**Claude Code options**
1. Preferred: use `next/font/local` with committed font files.
2. Or document requirement/network caveat in README + CI.

---

## Medium-priority correctness/consistency

### M1) Grid model inconsistency across code/docs/comments
- `docs/brief.md` says 20-column row-major, canvas constants use 10 columns.
- `approve` comments and `PlotPicker` encoding imply 10x10 encoded in `grid_x`; seed data uses separate `grid_x/grid_y` row/col style.

**Claude Code fix steps**
1. Pick one canonical model:
   - either explicit `(grid_x, grid_y)` coordinates
   - or encoded `grid_x` + fixed `grid_y=0`
2. Refactor conversion helpers and approve logic to one model.
3. Align seed data and docs accordingly.

---

### M2) Minor stats logic oddity
- `const oldest = newestResult.data ? oldestResult.data : null;` should likely depend on `oldestResult` success, not `newestResult`.

**Fix**
- Use `const oldest = oldestResult.data ?? null;`.

---

### M3) Remove dead fields or wire them through
- `birthYear` / `deathYear` collected in bury form but not submitted/stored/displayed.

**Fix options**
- Either remove from UI, or add to schema/metadata and render on tombstones/pages.

---

## Documentation improvements (strongly recommended)

### D1) Replace placeholder README
Current README is default create-next-app text and does not describe actual project.

**Claude Code should rewrite README with:**
1. Project overview and product concept.
2. Architecture diagram (frontend/API/Supabase/Stripe/Resend/Upstash).
3. Local setup + required env vars table.
4. Database bootstrap + migrations workflow.
5. Webhook testing instructions (Stripe CLI).
6. Moderation/admin workflow.
7. Security model (service role isolation, webhook verification, rate limits, IP hashing).
8. Troubleshooting section (font fetch/build caveat, Supabase RLS, missing env vars).

### D2) Add `docs/OPERATIONS.md`
Include:
- Incident runbook (Stripe webhook down, Supabase outage, Upstash outage)
- How to rotate secrets
- How to backfill stats counters
- How to perform moderation safely

### D3) Add `docs/API.md`
Document each route:
- method, payload schema, response shape, status codes, rate limits, auth requirements.

### D4) Add `docs/DB_SCHEMA.md`
Human-readable schema + lifecycle states (`pending -> approved/rejected`) + trigger behavior.

---

## Site/feature insights and product improvements

### F1) Improve conversion funnel
1. Add funnel analytics events:
   - `view_bury_page`, `step_1_complete`, `step_2_complete`, `checkout_created`, `checkout_success`
2. Track drop-off by tier selection.
3. A/B test CTA copy on homepage and graveyard subheader.

### F2) Improve discovery/retention
1. Add search/filter (subject text, tier, latest/popular).
2. Add “Trending this week” section using recent visit_count/report-safe logic.
3. Add “related graves” on grave detail page.

### F3) Improve social loops
1. Sharable cards for latest/top mausoleums.
2. Weekly digest endpoint (top 10 new burials) for social posting automation.
3. Add copy variants for share text by tier.

### F4) Moderation quality improvements
1. Move blocklist from hardcoded array to DB/config file.
2. Add severity categories and auto-action policy.
3. Add admin actions log table (`moderation_events`) for auditability.

### F5) Performance improvements
1. Paginate “recent burials” on homepage if count grows large.
2. Consider server-driven projection table for heavy stats queries.
3. Add selective realtime subscriptions (approved rows only).

---

## Suggested implementation order for Claude Code
1. **Schema alignment migration** (C1).
2. **Admin auth hardening** (C2).
3. **Session endpoint hardening/removal** (C3).
4. **API JSON parse hardening** (C4).
5. **PlotPicker approved-only filter + IP helper** (H1/H2).
6. **Lint/build stability fixes** (H3/H4).
7. **Consistency cleanup + docs refresh** (M/D sections).

---

## Verification checklist for Claude Code
After applying fixes:
1. `npm run typecheck` passes.
2. `npm run lint` passes.
3. `npm run build` passes in CI environment.
4. Manual smoke:
   - Bury flow creates checkout session.
   - Webhook inserts pending grave.
   - Admin login works with secure cookie flow.
   - Approve/reject works.
   - Grave page view increments visit count.
   - Report increments report_count via RPC.
   - Stats page renders tier and most visited without errors.

