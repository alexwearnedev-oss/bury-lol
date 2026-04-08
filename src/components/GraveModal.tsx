'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Tombstone from './Tombstone';
import type { Grave } from '@/lib/types';

interface GraveModalProps {
  grave:   Grave;
  onClose: () => void;
}

export default function GraveModal({ grave, onClose }: GraveModalProps) {
  const [copied,    setCopied]    = useState(false);
  const [reported,  setReported]  = useState(false);
  const [reporting, setReporting] = useState(false);

  const shareUrl  = `${typeof window !== 'undefined' ? window.location.origin : ''}/grave/${grave.share_token}`;
  const tweetText = `I just buried ${grave.subject} on bury.lol for $${(grave.amount_paid / 100).toFixed(0)}. RIP. ${shareUrl}`;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReport = async () => {
    if (reported || reporting) return;
    setReporting(true);
    try {
      await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareToken: grave.share_token }),
      });
      setReported(true);
    } catch { /* silently fail */ }
    finally { setReporting(false); }
  };

  const buriedDate = new Date(grave.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const tierNames: Record<number, string> = {
    1: 'Shallow grave', 2: 'Proper burial', 3: 'Deluxe tombstone', 4: 'The Mausoleum',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="pixel-border relative max-h-[90vh] w-full max-w-sm overflow-y-auto"
        style={{ background: '#12102A' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-purple" style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}>
            ✦ R.I.P. ✦
          </span>
          <button
            onClick={onClose}
            className="text-dim transition-colors hover:text-cream"
            style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tombstone */}
        <div className="flex justify-center border-b border-border bg-black/30 py-6">
          <Tombstone
            subject={grave.subject}
            epitaph={grave.epitaph ?? undefined}
            buried_by={grave.buried_by}
            icon={grave.icon}
            tier={grave.tier}
          />
        </div>

        {/* Details */}
        <div className="border-b border-border p-4">
          <h2
            className="mb-1 text-center text-cream"
            style={{ fontFamily: 'var(--font-vt323)', fontSize: 26 }}
          >
            RIP {grave.subject}
          </h2>
          {grave.epitaph && (
            <p
              className="mb-2 text-center text-muted italic"
              style={{ fontFamily: 'var(--font-vt323)', fontSize: 17 }}
            >
              &ldquo;{grave.epitaph}&rdquo;
            </p>
          )}
          <div className="space-y-1 text-center">
            <p className="text-dim" style={{ fontFamily: 'var(--font-vt323)', fontSize: 15 }}>
              Buried by {grave.buried_by} · {buriedDate}
            </p>
            <p className="text-dim" style={{ fontFamily: 'var(--font-vt323)', fontSize: 14 }}>
              ${(grave.amount_paid / 100).toFixed(0)} paid · {tierNames[grave.tier]}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline py-2 text-center"
              style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }}
            >
              Share on X
            </a>
            <button
              onClick={handleCopy}
              className="btn-outline py-2"
              style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }}
            >
              {copied ? '✓ Copied!' : 'Copy link'}
            </button>
          </div>
          <Link
            href={`/grave/${grave.share_token}`}
            className="btn-purple mb-3 block w-full py-2 text-center"
            style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }}
            onClick={onClose}
          >
            View grave page →
          </Link>
          <div className="text-center">
            <button
              onClick={handleReport}
              disabled={reported || reporting}
              className="text-dim/40 transition-colors hover:text-dim disabled:cursor-default"
              style={{ fontFamily: 'var(--font-pixel)', fontSize: 5 }}
            >
              {reported ? 'Reported' : reporting ? 'Reporting...' : 'Report this grave'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
