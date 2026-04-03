'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import Tombstone from './Tombstone';
import GraveModal from './GraveModal';
import type { Grave } from '@/lib/types';

interface GraveyardGridProps {
  initialGraves: Grave[];
}

export default function GraveyardGrid({ initialGraves }: GraveyardGridProps) {
  const [graves, setGraves] = useState<Grave[]>(initialGraves);
  const [selectedGrave, setSelectedGrave] = useState<Grave | null>(null);
  const [newGraveIds, setNewGraveIds] = useState<Set<string>>(new Set());

  // Supabase realtime — append newly approved graves without page reload
  useEffect(() => {
    const channel = supabaseClient
      .channel('public:graves')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'graves' },
        (payload) => {
          const updated = payload.new as Grave;
          // Only add if newly approved, non-mausoleum, and not already in list
          if (
            updated.status === 'approved' &&
            updated.tier !== 4
          ) {
            setGraves((prev) => {
              if (prev.find((g) => g.id === updated.id)) return prev;
              setNewGraveIds((ids) => new Set(Array.from(ids).concat(updated.id)));
              // Remove the "new" highlight after 3 seconds
              setTimeout(() => {
                setNewGraveIds((ids) => {
                  const next = new Set(ids);
                  next.delete(updated.id);
                  return next;
                });
              }, 3000);
              return [...prev, updated];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  if (graves.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <p className="text-center text-stone">
          Nothing buried yet. Suspicious. The internet has never lost anything?
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Graveyard grid — 20 cols desktop, 10 tablet, 5 mobile */}
      <div className="w-full px-2 py-4">
        <div className="flex flex-wrap gap-1">
          {graves.map((grave) => (
            <button
              key={grave.id}
              onClick={() => setSelectedGrave(grave)}
              title={`${grave.subject}${grave.epitaph ? ` — ${grave.epitaph}` : ''}`}
              aria-label={`View grave for ${grave.subject}`}
              className={`cursor-pointer rounded transition-all duration-300 hover:brightness-125 focus:outline-none focus:ring-1 focus:ring-stone/50 ${
                newGraveIds.has(grave.id) ? 'ring-1 ring-moss animate-pulse' : ''
              }`}
            >
              <Tombstone
                subject={grave.subject}
                epitaph={grave.epitaph ?? undefined}
                buried_by={grave.buried_by}
                tier={grave.tier}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Modal */}
      {selectedGrave && (
        <GraveModal
          grave={selectedGrave}
          onClose={() => setSelectedGrave(null)}
        />
      )}
    </>
  );
}
