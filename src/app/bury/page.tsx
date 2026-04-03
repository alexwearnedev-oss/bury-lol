'use client';

import { useState } from 'react';
import Link from 'next/link';
import Tombstone from '@/components/Tombstone';

const TIERS = [
  { tier: 1 as const, price: '$1', name: 'A shallow grave', desc: 'Standard tombstone' },
  { tier: 2 as const, price: '$2', name: 'A proper burial', desc: 'The classic choice' },
  { tier: 3 as const, price: '$5', name: 'Deluxe tombstone', desc: '1.5x size, decorative border' },
  { tier: 4 as const, price: '$50', name: 'The Mausoleum', desc: 'Pinned to top, animated, legendary' },
];

export default function BuryPage() {
  const [subject, setSubject] = useState('');
  const [epitaph, setEpitaph] = useState('');
  const [buriedBy, setBuriedBy] = useState('');
  const [tier, setTier] = useState<1 | 2 | 3 | 4>(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!subject.trim()) {
      setError('You need to bury something.');
      return;
    }

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

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-stone/20 px-4 py-3">
        <Link href="/" className="font-serif text-xl font-bold tracking-tight text-cream">
          bury.lol
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <h1 className="mb-2 text-center font-serif text-3xl font-bold text-cream">
            Dig a grave
          </h1>
          <p className="mb-8 text-center text-sm text-stone">
            Buy a grave. Write a eulogy. Let it go.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Subject */}
            <div>
              <label htmlFor="subject" className="mb-1 block text-sm text-cream">
                What are you burying? <span className="text-stone">*</span>
              </label>
              <input
                id="subject"
                type="text"
                maxLength={50}
                required
                placeholder="Vine, my sleep schedule, Internet Explorer..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded border border-stone/30 bg-bg px-3 py-2 text-cream placeholder-stone/50 outline-none focus:border-cream/50"
              />
              <span className="mt-1 block text-right text-xs text-stone">
                {subject.length}/50
              </span>
            </div>

            {/* Epitaph */}
            <div>
              <label htmlFor="epitaph" className="mb-1 block text-sm text-cream">
                Epitaph <span className="text-stone">(optional)</span>
              </label>
              <textarea
                id="epitaph"
                maxLength={80}
                rows={2}
                placeholder="Gone but not forgotten. Mostly forgotten."
                value={epitaph}
                onChange={(e) => setEpitaph(e.target.value)}
                className="w-full resize-none rounded border border-stone/30 bg-bg px-3 py-2 text-cream placeholder-stone/50 outline-none focus:border-cream/50"
              />
              <span className="mt-1 block text-right text-xs text-stone">
                {epitaph.length}/80
              </span>
            </div>

            {/* Buried by */}
            <div>
              <label htmlFor="buried_by" className="mb-1 block text-sm text-cream">
                Buried by <span className="text-stone">(optional — default: Anonymous)</span>
              </label>
              <input
                id="buried_by"
                type="text"
                maxLength={30}
                placeholder="Anonymous"
                value={buriedBy}
                onChange={(e) => setBuriedBy(e.target.value)}
                className="w-full rounded border border-stone/30 bg-bg px-3 py-2 text-cream placeholder-stone/50 outline-none focus:border-cream/50"
              />
            </div>

            {/* Tier selector */}
            <div>
              <label className="mb-2 block text-sm text-cream">Choose your burial</label>
              <div className="grid grid-cols-2 gap-3">
                {TIERS.map((t) => (
                  <button
                    key={t.tier}
                    type="button"
                    onClick={() => setTier(t.tier)}
                    className={`rounded border px-3 py-3 text-left transition-colors ${
                      tier === t.tier
                        ? t.tier === 4
                          ? 'border-mausoleum bg-mausoleum/10 text-cream'
                          : 'border-cream/50 bg-cream/5 text-cream'
                        : t.tier === 4
                          ? 'border-mausoleum/40 text-stone hover:border-mausoleum/70'
                          : 'border-stone/30 text-stone hover:border-stone/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {t.tier === 4 ? '👑 ' : ''}
                        {t.price}
                      </span>
                    </div>
                    <div className="mt-1 text-xs">{t.name}</div>
                    <div className="mt-0.5 text-xs opacity-60">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Live preview */}
            <div>
              <label className="mb-2 block text-sm text-stone">Preview</label>
              <div className="flex justify-center overflow-x-auto rounded border border-stone/20 bg-black/30 p-6">
                <Tombstone
                  subject={subject || 'Your thing here'}
                  epitaph={epitaph || undefined}
                  buried_by={buriedBy || undefined}
                  tier={tier}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-center text-sm text-red-400">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !subject.trim()}
              className="w-full rounded bg-cream py-3 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? 'Digging...' : `Dig the grave → ${TIERS.find((t) => t.tier === tier)?.price}`}
            </button>
            {!subject.trim() && !loading && (
              <p className="text-center text-xs text-stone">
                ↑ Enter what you&apos;re burying to continue
              </p>
            )}
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone/20 px-4 py-4 text-center text-xs text-stone">
        Made by the internet, for the internet. No one is in charge here.
      </footer>
    </div>
  );
}
