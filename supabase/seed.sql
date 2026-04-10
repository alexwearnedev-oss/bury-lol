-- ============================================================
-- bury.lol — Pre-launch seed data
-- 40 culturally relevant graves, pre-approved
-- Run once in the Supabase SQL editor before going live
-- ============================================================

INSERT INTO graves (
  subject, epitaph, buried_by, tier, amount_paid,
  stripe_session_id, paid_at, status, moderated_at,
  grid_x, grid_y, share_token, created_at, ip_hash
) VALUES

-- ════════════════════════════════════════════════════
-- THE MAUSOLEUM — tier 4, no grid position
-- ════════════════════════════════════════════════════

(
  'Vine',
  'You taught us comedy in six seconds flat',
  'The Internet',
  4, 5000, 'seed_01',
  NOW() - INTERVAL '90 days', 'approved', NOW() - INTERVAL '89 days 20 hours',
  NULL, NULL, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '90 days', 'seeded'
),

-- ════════════════════════════════════════════════════
-- TIER 3 — Deluxe Tombstones  (grid row 0, cols 0–5)
-- ════════════════════════════════════════════════════

(
  'Flash Player',
  'Took Newgrounds, Miniclip, and our sick days with it',
  'Adobe (December 2020)',
  3, 500, 'seed_02',
  NOW() - INTERVAL '87 days', 'approved', NOW() - INTERVAL '86 days 22 hours',
  0, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '87 days', 'seeded'
),
(
  'The Attention Span',
  'Gone before I finished writing this',
  'TikTok (est. 2016)',
  3, 500, 'seed_03',
  NOW() - INTERVAL '84 days', 'approved', NOW() - INTERVAL '83 days 21 hours',
  1, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '84 days', 'seeded'
),
(
  'NFTs',
  'Worth millions. Now worth this epitaph.',
  'The Crypto Bros',
  3, 500, 'seed_04',
  NOW() - INTERVAL '79 days', 'approved', NOW() - INTERVAL '78 days 23 hours',
  2, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '79 days', 'seeded'
),
(
  '2012 Tumblr',
  'The last truly unhinged era',
  'A Tumblr Enjoyer',
  3, 500, 'seed_05',
  NOW() - INTERVAL '73 days', 'approved', NOW() - INTERVAL '72 days 20 hours',
  3, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '73 days', 'seeded'
),
(
  'MSN Messenger',
  'BRB was always a lie',
  'Anonymous',
  3, 500, 'seed_06',
  NOW() - INTERVAL '67 days', 'approved', NOW() - INTERVAL '66 days 22 hours',
  4, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '67 days', 'seeded'
),
(
  'The Metaverse',
  'Zuckerberg spent $36B here. Nobody came.',
  'Mark Zuckerberg',
  3, 500, 'seed_07',
  NOW() - INTERVAL '61 days', 'approved', NOW() - INTERVAL '60 days 23 hours',
  5, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '61 days', 'seeded'
),

-- ════════════════════════════════════════════════════
-- TIER 2 — Proper Burials  (grid row 0, cols 6–19)
-- ════════════════════════════════════════════════════

(
  'Google+',
  'Tried to make us leave Facebook. We did not.',
  'Anonymous',
  2, 200, 'seed_08',
  NOW() - INTERVAL '59 days', 'approved', NOW() - INTERVAL '58 days 22 hours',
  6, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '59 days', 'seeded'
),
(
  'Google Reader',
  'Died so Twitter could live. Not worth it.',
  'RSS Believers United',
  2, 200, 'seed_09',
  NOW() - INTERVAL '57 days', 'approved', NOW() - INTERVAL '56 days 21 hours',
  7, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '57 days', 'seeded'
),
(
  'Pre-Algorithm Instagram',
  'Back when filters were enough',
  'The Algorithm',
  2, 200, 'seed_10',
  NOW() - INTERVAL '55 days', 'approved', NOW() - INTERVAL '54 days 23 hours',
  8, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '55 days', 'seeded'
),
(
  'Old Twitter',
  'Before the ratio. Before the discourse. Before all this.',
  'A Twitter Purist',
  2, 200, 'seed_11',
  NOW() - INTERVAL '52 days', 'approved', NOW() - INTERVAL '51 days 20 hours',
  9, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '52 days', 'seeded'
),
(
  'My Work-Life Balance',
  'Died March 2020. Body not recovered.',
  'My Employer',
  2, 200, 'seed_12',
  NOW() - INTERVAL '50 days', 'approved', NOW() - INTERVAL '49 days 22 hours',
  10, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '50 days', 'seeded'
),
(
  'My 5-Year Plan',
  'Lasted until February of year one',
  'My Therapist',
  2, 200, 'seed_13',
  NOW() - INTERVAL '48 days', 'approved', NOW() - INTERVAL '47 days 21 hours',
  11, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '48 days', 'seeded'
),
(
  'The Reply-All Email',
  'Thousands affected. Zero helped.',
  'IT Department',
  2, 200, 'seed_14',
  NOW() - INTERVAL '46 days', 'approved', NOW() - INTERVAL '45 days 23 hours',
  12, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '46 days', 'seeded'
),
(
  'Internet Explorer',
  'Still loading',
  'Steve Jobs (posthumously)',
  2, 200, 'seed_15',
  NOW() - INTERVAL '44 days', 'approved', NOW() - INTERVAL '43 days 22 hours',
  13, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '44 days', 'seeded'
),
(
  'The Headphone Jack',
  'Courage, they called it',
  'Apple (2016)',
  2, 200, 'seed_16',
  NOW() - INTERVAL '42 days', 'approved', NOW() - INTERVAL '41 days 20 hours',
  14, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '42 days', 'seeded'
),
(
  'Toys R Us',
  'I don''t want to grow up',
  'Private Equity',
  2, 200, 'seed_17',
  NOW() - INTERVAL '40 days', 'approved', NOW() - INTERVAL '39 days 23 hours',
  15, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '40 days', 'seeded'
),
(
  'Blockbuster',
  'Be kind. Rewind. One store remains in Bend, OR.',
  'Late Fees',
  2, 200, 'seed_18',
  NOW() - INTERVAL '38 days', 'approved', NOW() - INTERVAL '37 days 21 hours',
  16, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '38 days', 'seeded'
),
(
  'MySpace',
  'Tom was the only friend who mattered',
  'Tom Anderson',
  2, 200, 'seed_19',
  NOW() - INTERVAL '36 days', 'approved', NOW() - INTERVAL '35 days 22 hours',
  17, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '36 days', 'seeded'
),
(
  'The AIM Away Message',
  'The first status update. A literary art form.',
  'AIM Historians',
  2, 200, 'seed_20',
  NOW() - INTERVAL '34 days', 'approved', NOW() - INTERVAL '33 days 20 hours',
  18, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '34 days', 'seeded'
),
(
  'Beanie Babies as Investment',
  'The original crypto',
  'A Beanie Baby Investor',
  2, 200, 'seed_21',
  NOW() - INTERVAL '32 days', 'approved', NOW() - INTERVAL '31 days 23 hours',
  19, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '32 days', 'seeded'
),

-- ════════════════════════════════════════════════════
-- TIER 2 continued  (display row 2, cols 0–5)
-- Canonical encoding: grid_x = row*10 + col, grid_y = 0
-- ════════════════════════════════════════════════════

(
  'Windows XP',
  'The Bliss wallpaper lives on in our hearts',
  'A Windows XP Enjoyer',
  2, 200, 'seed_22',
  NOW() - INTERVAL '30 days', 'approved', NOW() - INTERVAL '29 days 22 hours',
  20, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '30 days', 'seeded'
),
(
  'My Will to Reply to Texts',
  'Seen. Processing. Eternally.',
  'Read receipts',
  2, 200, 'seed_23',
  NOW() - INTERVAL '28 days', 'approved', NOW() - INTERVAL '27 days 21 hours',
  21, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '28 days', 'seeded'
),
(
  'Clubhouse',
  'Peak pandemic cope. Gone by barbecue season.',
  'Silicon Valley VCs',
  2, 200, 'seed_24',
  NOW() - INTERVAL '26 days', 'approved', NOW() - INTERVAL '25 days 23 hours',
  22, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '26 days', 'seeded'
),
(
  'Wordle Before NYT Bought It',
  'The green squares were ours',
  'The New York Times',
  2, 200, 'seed_25',
  NOW() - INTERVAL '24 days', 'approved', NOW() - INTERVAL '23 days 20 hours',
  23, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '24 days', 'seeded'
),
(
  'My Ability to Be Bored',
  'Stolen by the smartphone. We didn''t notice until it was gone.',
  'The Smartphone',
  2, 200, 'seed_26',
  NOW() - INTERVAL '22 days', 'approved', NOW() - INTERVAL '21 days 22 hours',
  24, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '22 days', 'seeded'
),
(
  'The Ice Bucket Challenge',
  'We all did it. We all forgot why.',
  'The News Cycle',
  2, 200, 'seed_27',
  NOW() - INTERVAL '20 days', 'approved', NOW() - INTERVAL '19 days 21 hours',
  25, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '20 days', 'seeded'
),

-- ════════════════════════════════════════════════════
-- TIER 1 — Shallow Graves  (display row 2 cols 6–9, row 3 cols 0–8)
-- Canonical encoding: grid_x = row*10 + col, grid_y = 0
-- ════════════════════════════════════════════════════

(
  '"On Fleek"',
  'Peaked 2014. Cringe by 2015.',
  'Circa 2014',
  1, 100, 'seed_28',
  NOW() - INTERVAL '18 days', 'approved', NOW() - INTERVAL '17 days 23 hours',
  26, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '18 days', 'seeded'
),
(
  'Fidget Spinners',
  '2017''s entire personality',
  'Anxiety Merchants Inc.',
  1, 100, 'seed_29',
  NOW() - INTERVAL '17 days', 'approved', NOW() - INTERVAL '16 days 22 hours',
  27, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '17 days', 'seeded'
),
(
  'Planking',
  'The original viral trend. Lasted a week.',
  'The Internet (briefly)',
  1, 100, 'seed_30',
  NOW() - INTERVAL '16 days', 'approved', NOW() - INTERVAL '15 days 21 hours',
  28, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '16 days', 'seeded'
),
(
  'The Good Part of Facebook',
  'Before your uncle found it',
  'Your Uncle Gary',
  1, 100, 'seed_31',
  NOW() - INTERVAL '15 days', 'approved', NOW() - INTERVAL '14 days 23 hours',
  29, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '15 days', 'seeded'
),
(
  'My Faith in Comment Sections',
  'Killed by the first comment',
  'The First Commenter',
  1, 100, 'seed_32',
  NOW() - INTERVAL '14 days', 'approved', NOW() - INTERVAL '13 days 22 hours',
  30, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '14 days', 'seeded'
),
(
  'The Snooze Button''s Power Over Me',
  'Nine more minutes changed nothing',
  'Sleep Scientists',
  1, 100, 'seed_33',
  NOW() - INTERVAL '13 days', 'approved', NOW() - INTERVAL '12 days 20 hours',
  31, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '13 days', 'seeded'
),
(
  'CD-ROMs',
  'Loading... please wait... please wait...',
  'The Cloud',
  1, 100, 'seed_34',
  NOW() - INTERVAL '12 days', 'approved', NOW() - INTERVAL '11 days 23 hours',
  32, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '12 days', 'seeded'
),
(
  'My Inbox Zero',
  'Achieved once, 2019. Never again.',
  'My Past Self',
  1, 100, 'seed_35',
  NOW() - INTERVAL '11 days', 'approved', NOW() - INTERVAL '10 days 21 hours',
  33, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '11 days', 'seeded'
),
(
  'The Nintendo 3DS',
  'Held on longer than expected. A legend.',
  'A Handheld Believer',
  1, 100, 'seed_36',
  NOW() - INTERVAL '10 days', 'approved', NOW() - INTERVAL '9 days 22 hours',
  34, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '10 days', 'seeded'
),
(
  'Tumblr NSFW',
  'The Great Purge. December 2018.',
  'Apple App Store',
  1, 100, 'seed_37',
  NOW() - INTERVAL '9 days', 'approved', NOW() - INTERVAL '8 days 20 hours',
  35, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '9 days', 'seeded'
),
(
  'My New Year''s Resolutions',
  'Survived to January 9th. Heroic.',
  'Self-delusion',
  1, 100, 'seed_38',
  NOW() - INTERVAL '7 days', 'approved', NOW() - INTERVAL '6 days 23 hours',
  36, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '7 days', 'seeded'
),
(
  'AskJeeves',
  'He tried. He really tried.',
  'Jeeves',
  1, 100, 'seed_39',
  NOW() - INTERVAL '5 days', 'approved', NOW() - INTERVAL '4 days 22 hours',
  37, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '5 days', 'seeded'
),
(
  'The Friend Request',
  'Replaced by a follow. It was never the same.',
  'Facebook (2004-ish)',
  1, 100, 'seed_40',
  NOW() - INTERVAL '3 days', 'approved', NOW() - INTERVAL '2 days 21 hours',
  38, 0, encode(gen_random_bytes(6), 'hex'),
  NOW() - INTERVAL '3 days', 'seeded'
);

-- ════════════════════════════════════════════════════
-- Update the stats table to reflect seeded data
-- 1×$50 + 6×$5 + 20×$2 + 13×$1 = $133 = 13,300 cents
-- ════════════════════════════════════════════════════

UPDATE stats
SET
  total_approved = 40,
  total_revenue_cents = 13300,
  last_updated = NOW()
WHERE id = 1;
