'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Tombstone from '@/components/Tombstone';

interface GraveData {
  subject: string;
  epitaph: string | null;
  buried_by: string;
  tier: 1 | 2 | 3 | 4;
  amount_paid: number;
  share_token: string;
}

export default function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [grave, setGrave] = useState<GraveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    fetch(`/api/grave-by-session?session_id=${sessionId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setGrave(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sessionId]);

  const graveUrl = grave
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
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-stone">Digging...</p>
      </div>
    );
  }

  if (!grave) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4">
        <p className="mb-4 text-stone">
          Your grave is being processed. Even the afterlife has paperwork.
        </p>
        <Link href="/" className="text-sm text-cream underline">
          See the graveyard &rarr;
        </Link>
      </div>
    );
  }

  const isMausoleum = grave.tier === 4;

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-stone/20 px-4 py-3">
        <Link href="/" className="font-serif text-xl font-bold tracking-tight text-cream">
          bury.lol
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        {/* Tombstone */}
        <div className="mb-8">
          <Tombstone
            subject={grave.subject}
            epitaph={grave.epitaph ?? undefined}
            buried_by={grave.buried_by}
            tier={grave.tier}
          />
        </div>

        {/* Message */}
        <p className="mb-2 max-w-md text-center font-serif text-xl text-cream">
          {isMausoleum
            ? `A mausoleum. Truly, you loved ${grave.subject} more than anyone deserved to.`
            : `Rest easy, ${grave.subject}. You deserved better.`}
        </p>
        <p className="mb-8 text-center text-sm text-stone">
          Your grave is live soon.
        </p>

        {/* Share buttons */}
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-stone/30 px-5 py-2.5 text-sm text-cream transition-colors hover:border-cream/50"
          >
            Share on X / Twitter
          </a>
          <button
            onClick={handleCopy}
            className="rounded border border-stone/30 px-5 py-2.5 text-sm text-cream transition-colors hover:border-cream/50"
          >
            {copied ? 'Copied!' : 'Copy grave link'}
          </button>
        </div>

        {/* Back to graveyard */}
        <Link
          href="/"
          className="mt-8 text-sm text-stone transition-colors hover:text-cream"
        >
          See the graveyard &rarr;
        </Link>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone/20 px-4 py-4 text-center text-xs text-stone">
        Made by the internet, for the internet. No one is in charge here.
      </footer>
    </div>
  );
}
