'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabaseClient } from '@/lib/supabase-client';
import Tombstone from '@/components/Tombstone';
import type { Grave } from '@/lib/types';

export default function RandomGrave() {
  const [grave,   setGrave]   = useState<Grave | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchRandom = async () => {
    setLoading(true);
    const { count } = await supabaseClient
      .from('graves')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved');

    if (!count) { setLoading(false); setFetched(true); return; }

    const offset = Math.floor(Math.random() * count);
    const { data } = await supabaseClient
      .from('graves')
      .select('id, subject, epitaph, buried_by, tier, amount_paid, share_token, grid_x, grid_y, created_at, status, report_count, icon, visit_count')
      .eq('status', 'approved')
      .range(offset, offset)
      .single();

    setGrave(data as Grave | null);
    setLoading(false);
    setFetched(true);
  };

  return (
    <div>
      <button
        onClick={fetchRandom}
        disabled={loading}
        className="btn-outline px-6 py-3 disabled:opacity-50"
        style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}
      >
        {loading ? 'DIGGING...' : fetched ? '↻ ANOTHER ONE' : '🎲 RANDOM GRAVE'}
      </button>

      {fetched && grave && (
        <div className="mt-6 flex flex-col items-center gap-3 fade-in">
          <Link href={`/grave/${grave.share_token}`}>
            <Tombstone
              subject={grave.subject}
              epitaph={grave.epitaph ?? undefined}
              icon={grave.icon}
              tier={grave.tier}
            />
          </Link>
          <div className="text-center">
            <p className="text-cream" style={{ fontFamily: 'var(--font-vt323)', fontSize: 20 }}>
              &ldquo;{grave.subject}&rdquo;
            </p>
            {grave.epitaph && (
              <p className="mt-1 text-muted italic" style={{ fontFamily: 'var(--font-vt323)', fontSize: 16 }}>
                {grave.epitaph}
              </p>
            )}
            <p className="mt-1 text-dim" style={{ fontFamily: 'var(--font-vt323)', fontSize: 14 }}>
              buried by {grave.buried_by ?? 'Anonymous'} · ${(grave.amount_paid / 100).toFixed(0)}
            </p>
            <Link
              href={`/grave/${grave.share_token}`}
              className="mt-2 inline-block text-purple transition-colors hover:text-purpleLight"
              style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }}
            >
              View grave →
            </Link>
          </div>
        </div>
      )}

      {fetched && !grave && (
        <p className="mt-4 text-dim" style={{ fontFamily: 'var(--font-vt323)', fontSize: 16 }}>
          No graves found. Suspicious.
        </p>
      )}
    </div>
  );
}
