'use client';

import { useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import Tombstone from '@/components/Tombstone';
import type { Grave } from '@/lib/types';

export default function RandomGrave() {
  const [grave, setGrave] = useState<Grave | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchRandom = async () => {
    setLoading(true);
    // Supabase doesn't support ORDER BY RANDOM() directly via the JS client,
    // so we get the total count and pick a random offset
    const { count } = await supabaseClient
      .from('graves')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved');

    if (!count || count === 0) {
      setLoading(false);
      setFetched(true);
      return;
    }

    const offset = Math.floor(Math.random() * count);
    const { data } = await supabaseClient
      .from('graves')
      .select('id, subject, epitaph, buried_by, tier, amount_paid, share_token, grid_x, grid_y, created_at, status, report_count')
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
        className="rounded border border-stone/30 px-4 py-2 text-sm text-stone transition-colors hover:border-stone/60 hover:text-cream disabled:opacity-50"
      >
        {loading ? 'Digging...' : fetched ? 'Another random grave →' : 'Random grave →'}
      </button>

      {fetched && grave && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <Tombstone
            subject={grave.subject}
            epitaph={grave.epitaph ?? undefined}
            buried_by={grave.buried_by ?? undefined}
            tier={grave.tier}
          />
          <div className="text-center">
            <p className="text-sm text-cream">&ldquo;{grave.subject}&rdquo;</p>
            {grave.epitaph && (
              <p className="mt-1 text-xs italic text-stone">{grave.epitaph}</p>
            )}
            <p className="mt-1 text-xs text-stone/60">
              buried by {grave.buried_by ?? 'Anonymous'} &middot; ${(grave.amount_paid / 100).toFixed(0)}
            </p>
          </div>
        </div>
      )}

      {fetched && !grave && (
        <p className="mt-4 text-sm text-stone">No graves found. Suspicious.</p>
      )}
    </div>
  );
}
