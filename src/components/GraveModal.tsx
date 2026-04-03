'use client';

import { useEffect, useState } from 'react';
import Tombstone from './Tombstone';
import type { Grave } from '@/lib/types';

interface GraveModalProps {
  grave: Grave;
  onClose: () => void;
}

export default function GraveModal({ grave, onClose }: GraveModalProps) {
  const [copied, setCopied] = useState(false);
  const [reported, setReported] = useState(false);
  const [reporting, setReporting] = useState(false);

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/grave/${grave.share_token}`;
  const tweetText = `I just buried ${grave.subject} on bury.lol for $${(grave.amount_paid / 100).toFixed(0)}. RIP. ${shareUrl}`;

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Prevent body scroll
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
    } catch {
      // Silently fail
    } finally {
      setReporting(false);
    }
  };

  const buriedDate = new Date(grave.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Modal */}
      <div
        className="relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded border border-stone/30 bg-bg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-stone transition-colors hover:text-cream"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Tombstone */}
        <div className="mb-5 flex justify-center">
          <Tombstone
            subject={grave.subject}
            epitaph={grave.epitaph ?? undefined}
            buried_by={grave.buried_by}
            tier={grave.tier}
          />
        </div>

        {/* Details */}
        <div className="mb-4 space-y-1 text-center">
          <h2 className="font-serif text-xl font-bold text-cream">
            RIP {grave.subject}
          </h2>
          {grave.epitaph && (
            <p className="text-sm italic text-stone">&ldquo;{grave.epitaph}&rdquo;</p>
          )}
          <p className="text-xs text-stone/70">
            Buried by {grave.buried_by} · {buriedDate}
          </p>
          <p className="text-xs text-stone/50">
            ${(grave.amount_paid / 100).toFixed(0)} paid
          </p>
        </div>

        {/* Share buttons */}
        <div className="mb-3 flex gap-2">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded border border-stone/30 py-2 text-center text-xs text-cream transition-colors hover:border-cream/50"
          >
            Share on X
          </a>
          <button
            onClick={handleCopy}
            className="flex-1 rounded border border-stone/30 py-2 text-xs text-cream transition-colors hover:border-cream/50"
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>

        {/* Report */}
        <div className="text-center">
          <button
            onClick={handleReport}
            disabled={reported || reporting}
            className="text-xs text-stone/40 transition-colors hover:text-stone disabled:cursor-default"
          >
            {reported ? 'Reported' : reporting ? 'Reporting...' : 'Report this grave'}
          </button>
        </div>
      </div>
    </div>
  );
}
