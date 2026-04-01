# bury.lol — Master Project Brief v2
> Full product specification for Claude Code. Read this entire document before writing any code. Work through each section in order. Do not improvise on anything that is explicitly specified here.

---

## 0. Project overview

**bury.lol** is a viral web experience where anyone can pay a small fee to plant a pixel tombstone for something that is culturally dead — a dead app, trend, meme, era, or personal moment. The graveyard is a single shared canvas that grows over time as more people contribute. The core loop is: land → laugh → buy → share.

**Primary goal:** Go viral. Attention first, revenue second.
**Secondary goal:** Monetise immediately via low-friction impulse purchases.
**Audience:** Internet-native 18–35 year olds. Gen Z and Millennials. Twitter/X, TikTok, Reddit.
**Tone:** Absurdist, dark but warm. Made by the internet, for the internet. No one is in charge here.

---

## 1. Brand & tone guide

### Name & domain
- **Name:** bury.lol
- **Tagline:** "A final resting place for things the internet loved and lost."

### Voice principles
The brand has no visible founder. It feels community-built, slightly chaotic, and warmly absurd. Think: someone who grew up on Tumblr and now works in tech, writing copy at 2am.

| Moment | Copy |
|---|---|
| Hero headline | "A final resting place for things the internet loved and lost." |
| Sub-headline | "Buy a grave. Write a eulogy. Let it go." |
| Primary CTA | "Dig a grave — $2" |
| After purchase | "Rest easy, [thing]. You deserved better. Your grave is live soon." |
| Share prompt | "I just buried [thing] for $2. You can visit the grave." |
| Empty state | "Nothing buried yet. Suspicious. The internet has never lost anything?" |
| Loading state | "Digging..." |
| Error state | "Something went wrong. Even death has bugs." |
| Footer | "Made by the internet, for the internet. No one is in charge here." |
| Moderation pending | "Your grave is being processed. Even the afterlife has paperwork." |
| Mausoleum purchase | "A mausoleum. Truly, you loved [thing] more than anyone deserved to." |

### Visual identity
- **Palette:** Dark background (`#111111`), off-white text (`#F5F0E8`), muted stone-grey accents (`#888780`), faded moss green (`#3B6D11`) for live/active states, deep purple (`#3C3489`) for Mausoleum tier accents.
- **Typography:** Monospace or serif for tombstone inscriptions — use `'Courier New'` or load `'Playfair Display'` from Google Fonts for headings. Body in system sans-serif.
- **Aesthetic:** Minimal. Dark. A little eerie. No gradients. No bright colours. The tombstone grid is the hero — everything else gets out of its way.
- **Tombstone shape:** Simple rectangular SVG with a rounded arch top. Small enough to tile densely. Text inside in small monospace font.
- **Mausoleum visual:** 3× standard size. Subtle CSS animation on border (slow pulse or shimmer — no flashing). Crowned with a small decorative arch SVG. Visually unmissable without being garish.

---

## 2. Tech stack & architecture

### Guiding constraint
Free to launch. Must survive a viral traffic spike without going down. Scale to paid tiers only after revenue justifies it.

### Chosen stack

| Layer | Tool | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) | SSR for SEO, fast, Vercel-native |
| Hosting | Vercel (free tier) | Zero config, global CDN, scales automatically |
| Database | Supabase (free tier) | Postgres, realtime subscriptions, RLS, no cold-start penalty |
| Payments | Stripe | No monthly fee, 2.9% + 30¢ per transaction |
| Email | Resend (free tier) | 3,000 emails/month free, native Next.js SDK, React Email templates |
| Rate limiting | Upstash Redis (free tier) | Edge-compatible, 10,000 requests/day free — used for API rate limiting |
| Auth | None required | No user accounts — graves are anonymous |
| Moderation | Supabase + `/admin` route | Password-protected internal page, no external tool needed |

### Why Resend over Klaviyo
Klaviyo is a marketing automation platform — it's the right tool for campaigns, segmentation, and newsletters. bury.lol only needs transactional email (one purchase confirmation). Klaviyo's free tier caps at 250 profiles and 500 sends/month, and transactional emails are billed separately on top of that. Resend gives 3,000 free emails/month, integrates natively with Next.js, and supports React Email templates. When bury.lol eventually builds a marketing newsletter (weekly top graves, etc), revisit Klaviyo for that layer — but keep Resend for transactional.

### Architecture overview

```
User visits bury.lol
    → Next.js frontend (Vercel)
    → Fetches approved graves from Supabase (server component, ISR 60s cache)
    → Renders graveyard canvas

User clicks "Dig a grave"
    → Fills in form (subject, epitaph, name, tier)
    → POST /api/checkout
        → Rate limit check (Upstash Redis: 5 sessions/IP/hour)
        → Input validation + sanitisation
        → Creates Stripe Checkout session with metadata
    → Redirected to Stripe hosted payment page
    → On success → Stripe webhook → POST /api/webhook
        → Verify Stripe signature
        → Write grave to Supabase (status: 'pending')
        → Send confirmation email via Resend
    → Moderator approves via /admin → status: 'approved'
    → Grave appears live on canvas (realtime via Supabase subscription)
```

### Environment variables required
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=
ADMIN_PASSWORD=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_BASE_URL=https://bury.lol
```

---

## 3. Database schema

Run the following SQL in the Supabase SQL editor to set up the database.

```sql
-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Graves table
create table graves (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),

  -- What is being buried
  subject text not null check (char_length(subject) <= 50),
  epitaph text check (char_length(epitaph) <= 80),
  buried_by text default 'Anonymous' check (char_length(buried_by) <= 30),

  -- Tier
  tier integer not null default 2 check (tier in (1, 2, 3, 4)),
  -- 1 = Shallow ($1), 2 = Proper ($2), 3 = Deluxe ($5), 4 = Mausoleum ($50)

  -- Payment
  stripe_session_id text unique,
  amount_paid integer not null, -- in cents
  paid_at timestamp with time zone,

  -- Moderation
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  moderated_at timestamp with time zone,
  rejection_reason text,

  -- Canvas position (assigned on approval)
  grid_x integer,
  grid_y integer,

  -- Metadata
  ip_hash text,
  share_token text unique default encode(gen_random_bytes(6), 'hex'),

  -- Reporting
  report_count integer default 0
);

-- Stats table (materialised counters — updated via triggers for performance)
create table stats (
  id integer primary key default 1 check (id = 1), -- single-row table
  total_approved integer default 0,
  total_revenue_cents integer default 0,
  last_updated timestamp with time zone default now()
);

insert into stats (id) values (1);

-- Trigger: update stats on grave approval
create or replace function update_stats()
returns trigger as $$
begin
  if NEW.status = 'approved' and OLD.status != 'approved' then
    update stats set
      total_approved = total_approved + 1,
      total_revenue_cents = total_revenue_cents + NEW.amount_paid,
      last_updated = now()
    where id = 1;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger on_grave_approved
  after update on graves
  for each row execute function update_stats();

-- Indexes
create index graves_status_idx on graves(status);
create index graves_position_idx on graves(grid_x, grid_y);
create index graves_tier_idx on graves(tier);
create index graves_created_idx on graves(created_at desc);

-- Row Level Security
alter table graves enable row level security;
alter table stats enable row level security;

create policy "Public can read approved graves"
  on graves for select
  using (status = 'approved');

create policy "Public can read stats"
  on stats for select
  using (true);

-- No public writes — all writes via service role in API routes only
```

---

## 4. Grave tiers & pricing

| Tier | Price | Name | Canvas size | Special behaviour |
|---|---|---|---|---|
| 1 | $1 | A shallow grave | 80×100px | Standard tombstone |
| 2 | $2 | A proper burial | 80×100px | Pre-selected in form |
| 3 | $5 | Deluxe tombstone | 120×150px | Decorative border |
| 4 | $50 | The Mausoleum | 240×300px | Pinned to top of canvas, animated border, crown SVG, "Mausoleum" label, featured in weekly top graves post |

### Mausoleum tier details
- Displayed in a dedicated "Mausoleum Row" at the very top of the graveyard, before the main grid
- Maximum of 10 Mausoleums visible at once in this row (oldest scrolls off as new ones are added)
- Animated border: slow CSS `box-shadow` pulse (2s ease-in-out infinite) — no flashing
- Unique confirmation copy: "A mausoleum. Truly, you loved [thing] more than anyone deserved to."
- Appears in the weekly "Top Graves" social post
- This tier is intentionally absurd — someone buying it will post about it

---

## 5. UI/UX & page breakdown

### Pages to build

#### `/` — Home (the graveyard)
The homepage IS the graveyard. No marketing hero. No fluff. The grid is the product.

**Layout:**
- Sticky top bar: `bury.lol` logo left + stats pill centre (e.g. "1,247 souls at rest · $3,891 raised") + "Dig a grave →" CTA button right
- Mausoleum Row: horizontal strip at top showing Tier 4 graves — only visible when at least one Mausoleum exists
- Full-width scrollable grid of tombstones below, tiling top-left, newest bottom-right
- Tombstone sizes reflect tier (see section 4)
- Hover: tombstone lightens, tooltip shows full epitaph if truncated
- Click: small modal with full grave details + share link + report button
- Mobile: floating "Dig a grave" button fixed bottom-right

**Performance:** Use Next.js ISR with 60s revalidation. Do not fetch on every request. On viral traffic, the cached page serves from Vercel's edge — Supabase never sees the spike.

**Realtime layer:** On the client, subscribe to Supabase realtime for new approved graves. Append them to the canvas without a page reload. This makes the graveyard feel alive.

#### `/bury` — Buy a grave
Single focused form. Dark background. Centred card. No distractions.

**Form fields:**
1. "What are you burying?" — text, max 50 chars, required. Placeholder: "Vine, my sleep schedule, Internet Explorer..."
2. "Epitaph" — textarea, max 80 chars, optional. Placeholder: "Gone but not forgotten. Mostly forgotten."
3. "Buried by" — text, max 30 chars, optional. Default: "Anonymous"
4. Tier selector — four cards:
   - $1 — "A shallow grave"
   - $2 — "A proper burial" ← pre-selected
   - $5 — "Deluxe tombstone"
   - $50 — "The Mausoleum" (visually distinct — purple border, small crown icon)
5. Live tombstone preview — updates as user types, reflects selected tier size
6. "Dig the grave →" submit button

**Validation (client + server):**
- Subject: required, 1–50 chars, strip HTML tags
- Epitaph: optional, max 80 chars, strip HTML tags
- Buried by: optional, max 30 chars, strip HTML tags
- Tier: must be 1, 2, 3, or 4

#### `/success` — Post-purchase
After Stripe redirect. Show:
- Rendered tombstone (fetched by session ID from Supabase)
- Message: "Rest easy, [subject]. You deserved better. Your grave is live soon."
- Mausoleum variant: "A mausoleum. Truly, you loved [thing] more than anyone deserved to."
- Pre-filled share buttons:
  - Twitter/X: `I just buried [subject] on bury.lol for $[amount]. RIP. [grave URL]`
  - Copy link button (copies `/grave/[shareToken]`)
- "See the graveyard →" link home

#### `/grave/[shareToken]` — Individual grave permalink
Shareable page per grave. Shows tombstone large, epitaph, buried-by, date buried.

**Open Graph meta tags (critical for share previews):**
```tsx
// Use @vercel/og to generate a dynamic OG image
// Dimensions: 1200×630px
// Content: tombstone SVG centred on dark background
//   - Subject text large and centred
//   - Epitaph below in smaller text
//   - "bury.lol" branding bottom-right
//   - Tier-appropriate tombstone size/style

export async function generateMetadata({ params }) {
  const grave = await getGraveByToken(params.shareToken)
  return {
    title: `RIP ${grave.subject} — bury.lol`,
    description: grave.epitaph || `Buried on bury.lol for $${grave.amount_paid / 100}`,
    openGraph: {
      images: [`/api/og?token=${params.shareToken}`],
      title: `RIP ${grave.subject}`,
      description: grave.epitaph || 'Buried on bury.lol',
    },
    twitter: {
      card: 'summary_large_image',
      images: [`/api/og?token=${params.shareToken}`],
    }
  }
}
```

#### `/api/og` — Dynamic OG image generation
Uses `@vercel/og` (ImageResponse). Accepts `?token=[shareToken]`. Fetches grave from Supabase, renders a 1200×630 tombstone image. Dark background, grave subject large, epitaph below, tier-appropriate styling, bury.lol branding.

#### `/stats` — Public stats page
A simple, shareable page showing live graveyard statistics. This is itself a piece of shareable content.

**Show:**
- Total graves buried (approved count)
- Total revenue raised (e.g. "$4,231 raised from the dead")
- Most popular buried subject (most frequent subject text)
- Newest grave (live, updates via Supabase realtime)
- Oldest grave (first approved)
- Graves by tier breakdown (bar or simple text)
- "Graves buried today" counter
- A randomly surfaced grave ("Random grave" — refreshes on click)

Tone: keep it in-brand. "847 things the internet can finally grieve."

#### `/admin` — Moderation dashboard
Password-protected. Validated via middleware comparing against `ADMIN_PASSWORD` env var. No auth library needed.

**Shows:**
- Counts: pending / approved / rejected / total revenue
- Pending queue (newest first)
- Each grave: subject, epitaph, buried_by, tier, amount paid, IP hash, time submitted
- Approve button → calls `/api/approve` with `{ id, action: 'approve' }`
- Reject button → inline text field for reason → calls `/api/approve` with `{ id, action: 'reject', reason }`
- Reported graves tab: graves with `report_count > 0`, sorted by report count desc

#### `/api/checkout` — POST
**Rate limit first:** Check Upstash Redis before anything else. Allow 5 Stripe session creations per IP per hour. Return 429 if exceeded.

**Validate input:**
```typescript
const schema = {
  subject: z.string().min(1).max(50).transform(stripHtml),
  epitaph: z.string().max(80).optional().transform(stripHtml),
  buried_by: z.string().max(30).optional().transform(stripHtml),
  tier: z.number().int().min(1).max(4),
}
```

**Create Stripe session:**
```typescript
const tierConfig = {
  1: { amount: 100, name: 'A shallow grave' },
  2: { amount: 200, name: 'A proper burial' },
  3: { amount: 500, name: 'Deluxe tombstone' },
  4: { amount: 5000, name: 'The Mausoleum' },
}

session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: 'usd',
      unit_amount: tierConfig[tier].amount,
      product_data: {
        name: `${tierConfig[tier].name} for "${subject}"`,
        description: epitaph || 'No epitaph provided',
      },
    },
    quantity: 1,
  }],
  mode: 'payment',
  success_url: `${BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${BASE_URL}/bury`,
  metadata: { subject, epitaph: epitaph || '', buried_by: buried_by || 'Anonymous', tier: String(tier) },
})
```

#### `/api/webhook` — POST (Stripe webhook)
**Always verify the Stripe signature first.** Never process without it.

```typescript
const sig = request.headers.get('stripe-signature')
const event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)
// Throws if invalid — let it throw, return 400
```

On `checkout.session.completed`:
```typescript
await supabase.from('graves').insert({
  subject: session.metadata.subject,
  epitaph: session.metadata.epitaph || null,
  buried_by: session.metadata.buried_by || 'Anonymous',
  tier: parseInt(session.metadata.tier),
  stripe_session_id: session.id,
  amount_paid: session.amount_total,
  paid_at: new Date().toISOString(),
  status: 'pending',
  ip_hash: hashIP(request.headers.get('x-forwarded-for')),
})

// Send confirmation email via Resend
await resend.emails.send({
  from: 'bury.lol <noreply@bury.lol>',
  to: session.customer_details.email,
  subject: `RIP ${session.metadata.subject} — your grave is being dug`,
  react: GraveConfirmationEmail({ subject, epitaph, tier, shareUrl }),
})
```

#### `/api/approve` — POST (admin only)
Validates admin session token from cookie. Accepts `{ id, action, reason? }`.

On approve:
- Set `status = 'approved'`, `moderated_at = now()`
- Assign grid position (next available slot in row-major order, 20 columns wide)
- Tier 4 (Mausoleum): flag for Mausoleum Row instead of main grid

On reject:
- Set `status = 'rejected'`, `moderated_at = now()`, `rejection_reason = reason`

#### `/api/report` — POST (public)
Accepts `{ shareToken }`. Increments `report_count` on the grave. Rate-limited to 1 report per IP per grave. Graves with `report_count >= 3` are surfaced in the admin reported tab automatically.

---

## 6. Security

Security must be implemented from day one, not retrofitted. Apply all of the following.

### Input sanitisation
- Strip all HTML tags from all user inputs before storing. Use a library like `sanitize-html` or a simple regex strip.
- Never render user input as raw HTML anywhere. Always escape. Use React's default JSX escaping — never `dangerouslySetInnerHTML`.
- Validate all inputs server-side (Zod schema) even if client-side validation exists. Never trust the client.

### Rate limiting (Upstash Redis)
Apply rate limiting at the edge using `@upstash/ratelimit` on the following routes:

| Route | Limit |
|---|---|
| `POST /api/checkout` | 5 requests / IP / hour |
| `POST /api/report` | 1 request / IP / grave (keyed on IP+token) |
| `POST /api/webhook` | Exempt — protected by Stripe signature instead |

```typescript
// Example pattern using @upstash/ratelimit
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 h'),
})

const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
const { success } = await ratelimit.limit(ip)
if (!success) return new Response('Too many requests', { status: 429 })
```

### Stripe webhook security
Always verify the Stripe webhook signature. Never process a webhook event without it.

```typescript
const event = stripe.webhooks.constructEvent(
  await request.text(),
  request.headers.get('stripe-signature')!,
  process.env.STRIPE_WEBHOOK_SECRET!
)
```

### Admin route protection
Protect `/admin` and `/api/approve` with middleware:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const adminToken = request.cookies.get('admin_token')?.value
    if (adminToken !== process.env.ADMIN_PASSWORD) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }
}
```

Admin login: simple `/admin/login` page with a password field. On correct password, set a `httpOnly` cookie with the admin token. No third-party auth needed.

### Content Security Policy
Add a strict CSP header via `next.config.js`:

```javascript
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
    ].join('; '),
  },
]
```

### Supabase RLS
Never bypass RLS. All public reads go through the anon key (RLS enforced). All writes go through the service role key in server-side API routes only. Never expose the service role key to the client.

### IP hashing
Never store raw IPs. Hash them before storage:

```typescript
import { createHash } from 'crypto'
const hashIP = (ip: string) =>
  createHash('sha256').update(ip + process.env.IP_HASH_SALT).digest('hex').slice(0, 16)
```

Add `IP_HASH_SALT` to env vars — a random string generated at setup. This makes IP hashes non-reversible.

### Dependency hygiene
- Run `npm audit` before deploying
- Pin major versions in `package.json`
- Enable Vercel's automatic dependency vulnerability alerts

---

## 7. Email — Resend

### Setup
```typescript
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)
```

### Confirmation email template
Build as a React Email component at `emails/GraveConfirmation.tsx`:

```tsx
// emails/GraveConfirmation.tsx
// Props: subject, epitaph, tier, shareUrl, amount
// Content:
//   - Subject line: "RIP [subject] — your grave is being dug"
//   - Body: tombstone illustration (inline SVG or image)
//   - "Your grave is currently being reviewed. It'll be live within 24 hours."
//   - Tier-appropriate message (Mausoleum gets special copy)
//   - Share URL as a button: "Visit the grave →"
//   - Footer: "Made by the internet, for the internet."
//   - Unsubscribe not needed — this is transactional, one-time
```

### When to send
- Trigger from `/api/webhook` on `checkout.session.completed`
- Only send if `session.customer_details.email` exists (Stripe collects this by default on Checkout)
- Do not send on approval — the confirmation email is enough

---

## 8. Stats page — `/stats`

This is a public, shareable page. It should feel like part of the brand — dark, slightly absurd, fun. Not a dashboard.

**Data sources:**
- `stats` table: total approved, total revenue (pre-computed via trigger — fast)
- Live query for: newest grave, most common subject, graves today, tier breakdown
- Random grave: `select * from graves where status = 'approved' order by random() limit 1`

**Display format (in-brand copy):**

```
[number] things the internet can finally grieve.
$[revenue] raised from the dead.

Newest burial: "[subject]" — just now
Most buried: "[subject]" — [count] times
Today: [count] graves dug

Tiers:
  Shallow graves: [count]
  Proper burials: [count]
  Deluxe tombstones: [count]
  Mausoleums: [count]

[ Random grave ] ← button, refreshes on click
```

**Caching:** Cache the stats query for 30 seconds. The realtime freshness isn't critical here — approximate numbers are fine.

---

## 9. Moderation system

### Philosophy
Graves go live only after manual approval. This protects against hate speech, targeted harassment, spam, and legal risk. Review takes ~2 minutes/day at low volume.

### Rules for approval

**Auto-reject if:**
- Contains slurs or hate speech
- Targets a real named living individual in a mean-spirited or harmful way
- Is spam or contains a URL
- Is clearly nonsense/gibberish (likely bot)

**Approve if:**
- Cultural object, app, trend, meme, era, or abstract concept
- Self-deprecating ("my motivation", "my sleep schedule")
- Funny and harmless
- Affectionate reference to a celebrity or public figure ("RIP David Bowie's mullet" = fine)

**Edge cases:**
- Living politicians / public figures targeted by name: reject
- Mild profanity: fine
- Corporate brands: fine (e.g. "RIP Internet Explorer")

### Keyword blocklist (auto-reject before hitting queue)
Apply in `/api/webhook` before writing to Supabase. If subject or epitaph matches any blocked term, write the grave with `status: 'rejected'` and `rejection_reason: 'auto-rejected: blocklist'` — still write it (for audit trail) but never show it.

```typescript
const BLOCKLIST = [
  // Add slurs, hate terms here — not listed in this brief for obvious reasons
  // Seed with ~20 obvious terms at launch
]

const containsBlocklisted = (text: string) =>
  BLOCKLIST.some(term => text.toLowerCase().includes(term))
```

### Notifications
Set up a Supabase webhook to ping a Slack webhook or email (via Resend) when a new grave is submitted, so you know to check the queue. Target: review within 24 hours.

### Scale trigger
When submissions exceed ~50/day, add a more comprehensive keyword allowlist/blocklist and reduce the manual review burden. At 200+/day, consider a lightweight AI-assisted moderation step.

---

## 10. Launch & go-to-market plan

### Pre-launch: seed the graveyard
**Pre-fill 40 graves before any announcement.** An empty graveyard kills the joke on arrival. Add via the admin panel directly as pre-approved with manually assigned grid positions.

Seed ideas:

| Category | Examples |
|---|---|
| Dead apps/tech | Vine, MSN Messenger, Google+, Flash Player, Internet Explorer, MySpace Top 8, Google Reader, Clubhouse |
| Dead trends | Low-rise jeans, fidget spinners, Harlem Shake, planking, "on fleek", NFTs (peak era) |
| Dead feelings | My motivation, my sleep schedule, my will to reply to emails, my 5-year plan, my work-life balance |
| Dead eras | 2012 Tumblr, early Twitter, pre-algorithm Instagram, the good part of Facebook, peak Netflix |
| Dead misc | The snooze button's power over me, my faith in comment sections, reply-all emails, meaningful loading screens |

**Seed one Mausoleum too.** Pre-bury something absurd at the Mausoleum tier (e.g. "RIP Flash Player" or "RIP Vine") so that row exists and looks established on day one.

### Week-by-week plan

**Week 0 — Soft launch**
Share in 3–5 Discord servers and group chats. No public post. Observe natural behaviour. Fix bugs.

**Week 1 — Reddit**
Post to r/InternetIsBeautiful, r/mildlyinteresting, r/nostalgia, r/webdev — one per day. Frame as "I made this" not "check out my product."

Best performing title format: "I made a site where you can bury dead internet things for $2. Someone already buried their situationship."

**Week 2 — Twitter/X + TikTok**
Launch post:
```
I made a website where you can bury dead internet things for $2.

RIP Vine. RIP MSN Messenger. RIP my motivation.

The graveyard is filling up and I can't stop reading the tombstones.

bury.lol
```

Screenshot funny graves daily. Post them. The content creates itself.

TikTok: screen-record scrolling the graveyard. Add trending audio. No face needed.

**Week 3 — Press & creators**
Cold DM 5–10 mid-size creators (50k–500k) in tech/internet culture. One sentence + screenshot. No ask.
Product Hunt launch (Tuesday or Wednesday).
Hacker News Show HN.

**Week 4 — Recurring format**
Weekly "Top 10 graves this week" post across Twitter/X, Reddit, Instagram. This becomes the ongoing content engine.

---

## 11. Monetisation

### Current tiers
See section 4. $1 / $2 / $5 / $50.

### Revenue model
Direct. No subscriptions. No ads. Every grave = revenue.

**Free tier runway:**
- Vercel: free until ~100GB bandwidth/month
- Supabase: free until ~500MB database or 2GB bandwidth
- Resend: free for 3,000 emails/month
- Upstash: free for 10,000 requests/day

**Upgrade trigger:** When monthly revenue exceeds $50, upgrade Supabase Pro ($25/month). Everything else stays free until revenue covers it.

**Break-even scenario:** 25 graves at average $2 = $50 revenue. Covers first Supabase upgrade. The site is self-funding from the first 25 sales.

### Future monetisation (post-traction only)
- "Exhume a grave" — pay $1 to spotlight a grave for 24h (appears at top of grid temporarily)
- Sponsored graves — brands bury their own dead products ("RIP the headphone jack — Apple, 2016")
- Weekly "Graveyard of the Year" roundup post (content + merch potential)
- Print-on-demand: "In Loving Memory" poster of top graves

---

## 12. Build order for Claude Code

Work through these phases sequentially. Complete each phase before starting the next. Do not skip ahead.

### Phase 1 — Foundation
1. Initialise Next.js 14 project with TypeScript, Tailwind, ESLint
2. Install dependencies: `@supabase/supabase-js`, `stripe`, `resend`, `@vercel/og`, `zod`, `sanitize-html`, `@upstash/ratelimit`, `@upstash/redis`
3. Set up Supabase project, run schema SQL (section 3), confirm connection
4. Set up Stripe account, configure webhook endpoint pointing to `/api/webhook`
5. Set up Resend account, verify sending domain
6. Set up Upstash Redis (free tier), get REST credentials
7. Configure all environment variables
8. Set up security headers in `next.config.js` (section 6)
9. Deploy skeleton to Vercel, confirm environment variables are set, confirm it runs

### Phase 2 — Core feature: buy a grave
10. Build `/bury` form page with live tombstone SVG preview
11. Build `/api/checkout` with rate limiting and Zod validation
12. Build `/api/webhook` with Stripe signature verification and Supabase write
13. Build Resend confirmation email template (`emails/GraveConfirmation.tsx`)
14. Wire email sending into webhook handler
15. Build `/success` page with share buttons and pre-filled tweet copy
16. End-to-end test: submit form → Stripe test payment → webhook fires → grave in Supabase → confirmation email arrives → success page renders

### Phase 3 — The graveyard canvas
17. Build tombstone SVG component (all 4 tier variants)
18. Build graveyard canvas grid with ISR data fetching
19. Build Mausoleum Row component (only renders when Tier 4 graves exist)
20. Add hover states and click-to-modal on tombstones
21. Add Supabase realtime subscription for live grave updates
22. Add grave count + revenue stats to top bar (fetched from `stats` table)

### Phase 4 — Grave permalink + OG images
23. Build `/grave/[shareToken]` page
24. Build `/api/og` dynamic image endpoint using `@vercel/og`
25. Wire OG meta tags into `/grave/[shareToken]` page
26. Test share previews on Twitter card validator and OG debugger

### Phase 5 — Admin + moderation
27. Build `/admin/login` page with cookie-based auth
28. Build admin middleware protecting `/admin/*` and `/api/approve`
29. Build `/admin` moderation queue page
30. Build `/api/approve` route with grid position assignment
31. Build `/api/report` route with rate limiting
32. Add reported graves tab to admin dashboard

### Phase 6 — Stats + polish
33. Build `/stats` page (section 8)
34. Mobile responsiveness pass across all pages
35. Run `npm audit` and resolve any vulnerabilities
36. Add keyword blocklist to webhook handler
37. Set up Supabase notification webhook for new grave submissions
38. Full end-to-end test in production: buy → confirm → approve → live on canvas → share → OG image renders

### Phase 7 — Pre-launch
39. Seed 40 graves via admin panel (including 1 pre-seeded Mausoleum)
40. Manually assign grid positions to seeded graves
41. Verify Stripe is in live mode (not test mode)
42. Final check: all env vars set correctly in Vercel production
43. Confirm Stripe webhook is receiving live events
44. Go live

---

## 13. Key decisions & defaults

These are settled. Do not improvise — implement as specified.

| Decision | Implementation |
|---|---|
| Grid layout | Fixed 20-column grid, row-major order |
| Mausoleum canvas behaviour | Separate pinned row above main grid, max 10 visible |
| Tier 3 size | 1.5× standard (120×150px) |
| Tier 4 size | 3× standard (240×300px) |
| Grid width | 20 columns. Adjust breakpoint for mobile (5 columns) and tablet (10 columns) |
| Graves expiry | Never. Permanent. |
| Editing after purchase | Not allowed. Permanence is part of the product. |
| Max graves per IP | Soft log only — do not hard-block. Rate limit Stripe sessions instead. |
| Revenue display | Yes — show in top bar and /stats. Funny and adds social proof. |
| Report threshold | 3 reports surfaces grave in admin reported tab. Does not auto-hide. |
| IP storage | Hashed only (SHA-256 + salt). Never raw. |

---

*End of brief v2. Start with Phase 1. Do not proceed to Phase 2 until Phase 1 is fully working and deployed. Ask for clarification before making any architectural decisions not covered here.*
