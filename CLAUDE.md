# bury.lol — project context

## What this is
A viral graveyard website where users pay $1–$50 to bury dead internet things
(apps, trends, memes, eras). Built to go viral. Attention first, revenue second.

## Full brief
Read this before doing anything: @docs/brief.md

## Stack
- Next.js 14 (App Router, TypeScript)
- Supabase (database + realtime subscriptions)
- Stripe (payments — prebuilt Checkout, not Elements)
- Resend (transactional email only — one confirmation per purchase)
- Upstash Redis (rate limiting on API routes)
- Vercel (hosting)

## Current phase
Phase 1 — Foundation. Setting up project structure, confirming all services
connect, deploying skeleton to Vercel.

## Commands
```
npm run dev        # local dev server
npm run build      # production build
npm run typecheck  # run TypeScript type checker
npm run lint       # run ESLint
```

## Grave tiers
- Tier 1 = $1 — shallow grave — standard size (80×100px)
- Tier 2 = $2 — proper burial — standard size, pre-selected in form
- Tier 3 = $5 — deluxe tombstone — 1.5× size (120×150px)
- Tier 4 = $50 — the mausoleum — 3× size (240×300px), pinned row, animated border

## Non-negotiable rules — never break these
- ALL Supabase writes must use the service role key inside API routes only.
  Never expose the service role key client-side. Ever.
- Always verify Stripe webhook signature before processing any webhook event.
- Always run Zod validation on ALL API route inputs server-side.
- Never use dangerouslySetInnerHTML anywhere in the codebase.
- Rate limit /api/checkout (5 req/IP/hour) and /api/report (1 req/IP/grave)
  using Upstash Redis via @upstash/ratelimit.
- Never store raw IP addresses — hash with SHA-256 + IP_HASH_SALT only.
- Input sanitisation on all user-submitted text (subject, epitaph, buried_by)
  using sanitize-html before storing.

## Key files (once created)
- Full spec: docs/brief.md
- DB schema: supabase/schema.sql
- Env vars reference: .env.example
- Email template: emails/GraveConfirmation.tsx

## Important decisions (settled — do not change)
- Grid: 20 columns wide, row-major order
- Mausoleum tier: separate pinned row above main grid, max 10 visible
- Graves never expire, never editable after purchase
- Revenue counter displayed publicly on site ("$X raised from the dead")
- Admin auth: httpOnly cookie checked in middleware, no third-party auth library
- OG images: @vercel/og at 1200×630px, generated per grave at /api/og
