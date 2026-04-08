'use client';

import { useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Tombstone from '@/components/Tombstone';
import EmojiPicker from '@/components/EmojiPicker';

const TIERS = [
  { tier: 1 as const, price: '$1', name: 'A shallow grave',    desc: 'Standard tombstone',                  border: 'border-border' },
  { tier: 2 as const, price: '$2', name: 'A proper burial',    desc: 'The classic choice',                  border: 'border-border', default: true },
  { tier: 3 as const, price: '$5', name: 'Deluxe tombstone',   desc: '1.5× size · decorative border',      border: 'border-gold/50' },
  { tier: 4 as const, price: '$50', name: 'The Mausoleum',     desc: 'Pinned to top · animated · legendary', border: 'border-purple' },
];

const STEPS = [
  { n: 1, label: 'Write your RIP' },
  { n: 2, label: 'Choose an icon' },
  { n: 3, label: 'Pick a burial' },
  { n: 4, label: 'Confirm' },
];

function StepBar({ current }: { current: number }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-0">
      {STEPS.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`flex h-7 w-7 items-center justify-center ${
                s.n === current
                  ? 'step-active bg-purple text-cream'
                  : s.n < current
                    ? 'bg-purpleDark text-cream'
                    : 'bg-surface text-dim border border-border'
              }`}
              style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}
            >
              {s.n < current ? '✓' : s.n}
            </div>
            <span
              className={`hidden sm:block ${s.n === current ? 'text-cream' : 'text-dim'}`}
              style={{ fontFamily: 'var(--font-pixel)', fontSize: 5 }}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`mb-4 h-px w-8 sm:w-16 ${s.n < current ? 'bg-purpleDark' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function BuryPage() {
  const [step,     setStep]     = useState(1);
  const [subject,  setSubject]  = useState('');
  const [epitaph,  setEpitaph]  = useState('');
  const [buriedBy, setBuriedBy] = useState('');
  const [icon,     setIcon]     = useState('🪦');
  const [tier,     setTier]     = useState<1|2|3|4>(2);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          epitaph: epitaph.trim() || undefined,
          buried_by: buriedBy.trim() || undefined,
          tier,
          icon: icon || undefined,
        }),
      });
      if (res.status === 429) {
        setError('Too many graves. Even gravediggers need a break. Try again later.');
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Something went wrong. Even death has bugs.');
        setLoading(false);
        return;
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setError('Something went wrong. Even death has bugs.');
      setLoading(false);
    }
  };

  const selectedTier = TIERS.find(t => t.tier === tier)!;

  return (
    <div className="flex min-h-screen flex-col" style={{ background: '#0D0B1E' }}>
      <Nav />

      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          {/* Heading */}
          <h1
            className="mb-1 text-center text-cream"
            style={{ fontFamily: 'var(--font-pixel)', fontSize: 13 }}
          >
            CLAIM A PLOT
          </h1>
          <p
            className="mb-8 text-center text-muted"
            style={{ fontFamily: 'var(--font-vt323)', fontSize: 18 }}
          >
            Buy a grave. Write a eulogy. Let it go.
          </p>

          <StepBar current={step} />

          {/* ── Step 1: What are you burying ── */}
          {step === 1 && (
            <div className="fade-in pixel-border p-6" style={{ background: '#12102A' }}>
              <p className="mb-5 text-cream" style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}>
                🪦 WRITE YOUR RIP
              </p>

              <div className="mb-4">
                <label
                  htmlFor="subject"
                  className="mb-1 block text-muted"
                  style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}
                >
                  WHAT DIED?
                </label>
                <input
                  id="subject"
                  type="text"
                  maxLength={50}
                  required
                  placeholder="e.g. Vine, Flash, Limewire..."
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="pixel-input w-full px-3 py-2"
                  style={{ fontFamily: 'var(--font-vt323)', fontSize: 20 }}
                />
                <span className="mt-1 block text-right text-dim" style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }}>
                  {subject.length}/50
                </span>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-muted" style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}>
                    BIRTH YEAR
                  </label>
                  <input
                    type="text"
                    placeholder="1999"
                    maxLength={4}
                    className="pixel-input w-full px-3 py-2"
                    style={{ fontFamily: 'var(--font-vt323)', fontSize: 20 }}
                    readOnly
                    disabled
                    title="For decoration only — included in epitaph"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-muted" style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}>
                    DEATH YEAR
                  </label>
                  <input
                    type="text"
                    placeholder="2024"
                    maxLength={4}
                    className="pixel-input w-full px-3 py-2"
                    style={{ fontFamily: 'var(--font-vt323)', fontSize: 20 }}
                    readOnly
                    disabled
                    title="For decoration only — included in epitaph"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label
                  htmlFor="epitaph"
                  className="mb-1 block text-muted"
                  style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}
                >
                  EPITAPH <span className="text-dim">(optional)</span>
                </label>
                <textarea
                  id="epitaph"
                  maxLength={80}
                  rows={2}
                  placeholder="Gone but not forgotten. Mostly forgotten."
                  value={epitaph}
                  onChange={e => setEpitaph(e.target.value)}
                  className="pixel-input w-full resize-none px-3 py-2"
                  style={{ fontFamily: 'var(--font-vt323)', fontSize: 20 }}
                />
                <span className="mt-1 block text-right text-dim" style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }}>
                  {epitaph.length}/80
                </span>
              </div>

              <div className="mb-6">
                <label
                  htmlFor="buried_by"
                  className="mb-1 block text-muted"
                  style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}
                >
                  YOUR NAME <span className="text-dim">(optional)</span>
                </label>
                <input
                  id="buried_by"
                  type="text"
                  maxLength={30}
                  placeholder="Display name / handle"
                  value={buriedBy}
                  onChange={e => setBuriedBy(e.target.value)}
                  className="pixel-input w-full px-3 py-2"
                  style={{ fontFamily: 'var(--font-vt323)', fontSize: 20 }}
                />
              </div>

              <button
                type="button"
                disabled={!subject.trim()}
                onClick={() => setStep(2)}
                className="btn-purple w-full py-3 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}
              >
                NEXT →
              </button>
            </div>
          )}

          {/* ── Step 2: Choose icon ── */}
          {step === 2 && (
            <div className="fade-in">
              <div className="pixel-border mb-4 p-4" style={{ background: '#12102A' }}>
                <p className="mb-3 text-cream" style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}>
                  🎨 CHOOSE AN ICON
                </p>
                <p className="mb-4 text-muted" style={{ fontFamily: 'var(--font-vt323)', fontSize: 16 }}>
                  Pick an emoji that represents what you&apos;re burying. It&apos;ll appear on the tombstone.
                </p>
                <EmojiPicker value={icon} onChange={setIcon} />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-outline flex-1 py-3"
                  style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}
                >
                  ← BACK
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn-purple flex-1 py-3"
                  style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}
                >
                  NEXT →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Choose tier ── */}
          {step === 3 && (
            <div className="fade-in">
              <div className="pixel-border mb-4 p-4" style={{ background: '#12102A' }}>
                <p className="mb-4 text-cream" style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}>
                  ⚰ PICK A BURIAL
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {TIERS.map(t => (
                    <button
                      key={t.tier}
                      type="button"
                      onClick={() => setTier(t.tier)}
                      className={`border-2 p-3 text-left transition-all ${
                        tier === t.tier
                          ? t.tier === 4
                            ? 'border-purple bg-purple/10'
                            : t.tier === 3
                              ? 'border-gold/70 bg-gold/5'
                              : 'border-purpleLight/60 bg-purple/5'
                          : t.border + ' hover:border-muted/50'
                      }`}
                      style={{ background: tier === t.tier ? undefined : '#0D0B1E' }}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-gold" style={{ fontFamily: 'var(--font-pixel)', fontSize: 10 }}>
                          {t.price}
                        </span>
                        {t.tier === 4 && <span className="text-gold" style={{ fontSize: 14 }}>👑</span>}
                        {t.tier === 3 && <span className="text-gold" style={{ fontSize: 14 }}>⭐</span>}
                        {tier === t.tier && (
                          <span className="text-purple" style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }}>▶</span>
                        )}
                      </div>
                      <div className="text-cream" style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }}>
                        {t.name}
                      </div>
                      <div className="mt-1 text-dim" style={{ fontFamily: 'var(--font-vt323)', fontSize: 14 }}>
                        {t.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-outline flex-1 py-3"
                  style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}
                >
                  ← BACK
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="btn-purple flex-1 py-3"
                  style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}
                >
                  NEXT →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Preview + confirm ── */}
          {step === 4 && (
            <div className="fade-in">
              <div className="pixel-border mb-4 p-4" style={{ background: '#12102A' }}>
                <p className="mb-4 text-cream" style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}>
                  👁 PREVIEW
                </p>

                {/* Tombstone preview */}
                <div className="mb-5 flex justify-center overflow-x-auto rounded border border-border bg-black/40 p-6">
                  <Tombstone
                    subject={subject || 'Your thing here'}
                    epitaph={epitaph || undefined}
                    buried_by={buriedBy || undefined}
                    icon={icon || undefined}
                    tier={tier}
                  />
                </div>

                {/* Summary */}
                <div className="mb-4 space-y-2 border-t border-border pt-4">
                  {[
                    ['Burying',     subject],
                    ['Epitaph',     epitaph || '—'],
                    ['Buried by',   buriedBy || 'Anonymous'],
                    ['Icon',        icon || 'none'],
                    ['Tier',        selectedTier.name],
                    ['Price',       selectedTier.price],
                  ].map(([label, val]) => (
                    <div key={label} className="flex items-start justify-between gap-4">
                      <span className="shrink-0 text-dim" style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }}>
                        {label}
                      </span>
                      <span className="text-right text-cream" style={{ fontFamily: 'var(--font-vt323)', fontSize: 16 }}>
                        {val}
                      </span>
                    </div>
                  ))}
                </div>

                {error && (
                  <p className="mb-3 text-center text-crimson" style={{ fontFamily: 'var(--font-vt323)', fontSize: 16 }}>
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSubmit}
                  className="btn-purple w-full py-3 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}
                >
                  {loading ? 'DIGGING...' : `DIG THE GRAVE → ${selectedTier.price}`}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn-outline w-full py-3"
                style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}
              >
                ← BACK
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-border px-4 py-4 text-center text-dim"
        style={{ fontFamily: 'var(--font-vt323)', fontSize: 14 }}>
        Made by the internet, for the internet. No one is in charge here.
      </footer>
    </div>
  );
}
