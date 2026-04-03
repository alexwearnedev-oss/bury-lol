'use client';

import { useState } from 'react';
import Tombstone from './Tombstone';
import GraveModal from './GraveModal';
import type { Grave } from '@/lib/types';

interface MausoleumRowProps {
  graves: Grave[];
}

export default function MausoleumRow({ graves }: MausoleumRowProps) {
  const [selectedGrave, setSelectedGrave] = useState<Grave | null>(null);

  if (graves.length === 0) return null;

  return (
    <>
      <div className="border-b border-mausoleum/30 bg-mausoleum/5 px-4 py-6">
        <p className="mb-4 text-center text-xs uppercase tracking-widest text-mausoleum/70">
          The Mausoleum
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {graves.map((grave) => (
            <button
              key={grave.id}
              onClick={() => setSelectedGrave(grave)}
              className="tombstone-mausoleum cursor-pointer transition-opacity hover:opacity-80"
              title={grave.subject}
              aria-label={`View grave for ${grave.subject}`}
            >
              <Tombstone
                subject={grave.subject}
                epitaph={grave.epitaph ?? undefined}
                buried_by={grave.buried_by}
                tier={4}
              />
            </button>
          ))}
        </div>
      </div>

      {selectedGrave && (
        <GraveModal
          grave={selectedGrave}
          onClose={() => setSelectedGrave(null)}
        />
      )}
    </>
  );
}
