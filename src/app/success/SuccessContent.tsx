'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Tombstone from '@/components/Tombstone';

interface GraveData {
  subject:     string;
  epitaph:     string | null;
  buried_by:   string;
  tier:        1 | 2 | 3 | 4;
  amount_paid: number;
  share_token: string;
  icon:        string | null;
}

export default function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId    = searchParams.get('session_id');
  const [grave,    setGrave]   = useState<GraveData | null>(null);
  const [loading,  setLoading] = useState(true);
  const [copied,   setCopied]  = useState(false);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    fetch(`/api/grave-by-session?session_id=${sessionId}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (data) setGrave(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [sessionId]);

  const graveUrl  = grave
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/grave/${grave.share_token}`
    : '';
  const tweetText = grave
    ? `I just buried ${grave.subject} on bury.lol for $${(grave.amount_paid / 100).toFixed(0)}. RIP. ${graveUrl}`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(graveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#0D0B1E' }}>
        <p className="text-muted" style={{ fontFamily: 'var(--font-pixel)', fontSize: 9 }}>
          DIGGING...
        </p>
      </div>
    );
  }

  if (!grave) {
    return (
      <div className="flex min-h-screen flex-col" style={{ background: '#0D0B1E' }}>
        <Nav />
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <p className="mb-4 text-center text-muted" style={{ fontFamily: 'var(--font-vt323)', fontSize: 20 }}>
            Your grave is being processed. Even the afterlife has paperwork.
          </p>
          <Link
            href="/graveyard"
            className="btn-purple px-5 py-3"
            style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}
          >
            See the graveyard →
          </Link>
        </div>
      </div>
    );
  }

  const isMausoleum = grave.tier === 4;

  return (
    <div className="flex min-h-screen flex-col" style={{ background: '#0D0B1E' }}>
      <Nav />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        {/* Gold success banner */}
        <div
          className="mb-6 border border-gold/30 px-6 py-2 text-center"
          style={{ background: 'rgba(200,169,110,0.08)' }}
        >
          <p className="text-gold" style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}>
            ✦ GRAVE REGISTERED ✦
          </p>
        </div>

        {/* Tombstone */}
        <div className="mb-8 scale-110 sm:scale-125">
          <Tombstone
            subject={grave.subject}
            epitaph={grave.epitaph ?? undefined}
            buried_by={grave.buried_by}
            icon={grave.icon}
            tier={grave.tier}
          />
        </div>

        {/* Message */}
        <div className="pixel-border mb-6 max-w-md p-5 text-center" style={{ background: '#12102A' }}>
          <p className="mb-1 text-cream" style={{ fontFamily: 'var(--font-vt323)', fontSize: 22 }}>
            {isMausoleum
              ? `A mausoleum. Truly, you loved ${grave.subject} more than anyone deserved to.`
              : `Rest easy, ${grave.subject}. You deserved better.`}
          </p>
          <p className="text-muted" style={{ fontFamily: 'var(--font-vt323)', fontSize: 17 }}>
            Your grave is being reviewed and will be live within 24 hours.
          </p>
        </div>

        {/* Share */}
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-purple px-5 py-2.5"
            style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}
          >
            Share on X
          </a>
          <button
            onClick={handleCopy}
            className="btn-outline px-5 py-2.5"
            style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}
          >
            {copied ? '✓ Copied!' : 'Copy grave link'}
          </button>
        </div>

        <Link
          href="/graveyard"
          className="mt-6 text-muted transition-colors hover:text-cream"
          style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }}
        >
          See the graveyard →
        </Link>
      </main>

      <footer className="border-t border-border px-4 py-4 text-center text-dim"
        style={{ fontFamily: 'var(--font-vt323)', fontSize: 14 }}>
        Made by the internet, for the internet. No one is in charge here.
      </footer>
    </div>
  );
}
