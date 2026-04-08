'use client';

import { useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';

const FAQ = [
  {
    q: 'What is bury.lol?',
    a: 'A digital graveyard where you pay a small fee to plant a pixel tombstone for something that died on the internet — a dead app, meme, era, trend, or personal feeling. The graveyard is permanent, shared, and grows with every burial.',
  },
  {
    q: 'How do I claim a plot?',
    a: 'Click "Dig a grave", choose what you\'re burying, write an epitaph, pick an icon, choose your tier, and pay via Stripe. After a quick moderation check (usually under 24 hours) your grave goes live on the canvas.',
  },
  {
    q: 'How many plots are there?',
    a: 'Unlimited. The graveyard grows forever. New rows are added automatically as the canvas fills. Some things deserve to rest forever.',
  },
  {
    q: 'Can I edit my tombstone after placing it?',
    a: 'No. Permanence is part of the product. You loved it enough to bury it — now let it rest.',
  },
  {
    q: 'What are the tiers?',
    a: '$1 — A shallow grave (standard tombstone). $2 — A proper burial (the classic choice). $5 — Deluxe tombstone (1.5× size, decorative border). $50 — The Mausoleum (3× size, pinned to top, animated border, legendary status).',
  },
  {
    q: 'What happens when I buy a Mausoleum?',
    a: 'Your grave is pinned to the very top of the graveyard in the Mausoleum Row. It has an animated purple border, features in weekly Top Graves posts, and is unmissable. It\'s an absurd flex. Someone will screenshot it.',
  },
  {
    q: 'What gets moderated out?',
    a: 'Targeted harassment of real people, hate speech, spam, and URLs. Almost everything else is fair game. RIP to your ex\'s situationship? Fine. RIP to a corporation\'s failed product? Perfect. RIP to your will to reply to emails? Deeply relatable.',
  },
  {
    q: 'Who runs this?',
    a: 'The internet. No one is in charge here.',
  },
];

const STEPS = [
  { icon: '🔍', title: 'EXPLORE',     body: 'Browse the isometric graveyard and read epitaphs left by others.' },
  { icon: '🪦', title: 'CHOOSE',      body: 'Pick what you want to bury — an app, a feeling, a trend, an era.' },
  { icon: '✏️', title: 'MEMORIALIZE', body: 'Write an epitaph, choose an icon, pick your tier.' },
  { icon: '💳', title: 'CLAIM',       body: 'Pay once. Your tombstone is placed permanently in the graveyard.' },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-4 text-left transition-colors hover:bg-surfaceHi"
      >
        <span className="text-cream pr-4" style={{ fontFamily: 'var(--font-vt323)', fontSize: 18 }}>
          {q}
        </span>
        <span className="shrink-0 text-purple" style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div className="fade-in border-t border-border bg-bg/50 px-4 py-3">
          <p className="text-muted" style={{ fontFamily: 'var(--font-vt323)', fontSize: 17 }}>
            {a}
          </p>
        </div>
      )}
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: '#0D0B1E' }}>
      <Nav />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        {/* ── Header ── */}
        <div className="mb-8 text-center">
          <h1 className="mb-1 text-cream" style={{ fontFamily: 'var(--font-pixel)', fontSize: 14 }}>
            ABOUT
          </h1>
          <p className="text-purple" style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}>
            ✦ THE PROJECT ✦
          </p>
        </div>

        {/* ── The Story ── */}
        <div className="pixel-border mb-6 p-5" style={{ background: '#12102A' }}>
          <p className="mb-3 text-cream" style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}>
            🪦 THE STORY
          </p>
          <div className="space-y-3 text-muted" style={{ fontFamily: 'var(--font-vt323)', fontSize: 18, lineHeight: 1.6 }}>
            <p>
              The internet moves fast. Too fast. Websites we loved get shut down. Apps that defined
              our teenage years disappear overnight. Memes that united millions fade into obscurity.
            </p>
            <p>
              bury.lol is a place to remember. A digital graveyard where you can plant a tombstone
              for the piece of internet culture that meant something to you — whether it&apos;s Vine,
              Flash games, MSN Messenger, or that one forum that changed your life.
            </p>
            <p>
              Each grave is permanent. Each epitaph is forever. Together, we&apos;re building a
              monument to the internet we grew up with.
            </p>
          </div>
        </div>

        {/* ── How it works ── */}
        <div className="pixel-border mb-6" style={{ background: '#12102A' }}>
          <div className="border-b border-border px-5 py-4">
            <p className="text-cream" style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}>
              ⚙ HOW IT WORKS
            </p>
          </div>
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-start gap-4 border-b border-border px-5 py-4 last:border-b-0">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center bg-purple text-cream"
                style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}
              >
                {i + 1}
              </div>
              <div>
                <p className="mb-1 text-cream" style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}>
                  {s.title}
                </p>
                <p className="text-muted" style={{ fontFamily: 'var(--font-vt323)', fontSize: 17 }}>
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── FAQ ── */}
        <div className="pixel-border mb-6 overflow-hidden" style={{ background: '#12102A' }}>
          <div className="border-b border-border px-5 py-4">
            <p className="text-cream" style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}>
              ❓ FAQ
            </p>
          </div>
          {FAQ.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </div>

        {/* ── Connect ── */}
        <div className="pixel-border p-5 text-center" style={{ background: '#12102A' }}>
          <p className="mb-3 text-cream" style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}>
            📡 CONNECT
          </p>
          <p className="mb-4 text-muted" style={{ fontFamily: 'var(--font-vt323)', fontSize: 17 }}>
            Found a bug? Got a weird grave idea? Just want to say RIP to something?
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/graveyard"
              className="btn-purple px-5 py-2"
              style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}
            >
              Enter Graveyard
            </Link>
            <Link
              href="/bury"
              className="btn-outline px-5 py-2"
              style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}
            >
              Dig a grave
            </Link>
          </div>
          <p className="mt-6 text-dim" style={{ fontFamily: 'var(--font-vt323)', fontSize: 15 }}>
            Made by the internet, for the internet. No one is in charge here.
          </p>
        </div>
      </main>

      <footer className="border-t border-border px-4 py-4 text-center text-dim"
        style={{ fontFamily: 'var(--font-vt323)', fontSize: 14 }}>
        Made by the internet, for the internet. No one is in charge here.
      </footer>
    </div>
  );
}
