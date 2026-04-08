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
      <div
        className="border-b border-t border-purple/20"
        style={{
          background: 'linear-gradient(to bottom, #0c0b1a, #100e22)',
          padding: '20px 16px 0',
          overflowX: 'auto',
        }}
      >
        {/* Section label */}
        <p
          className="mb-4 text-center text-purpleLight/60 tracking-widest"
          style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}
        >
          ✦ THE MAUSOLEUM ✦
        </p>

        {/* Stars strip */}
        <div className="mb-2 flex justify-center gap-1 opacity-30">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} style={{ width: i % 4 === 0 ? 2 : 1, height: i % 4 === 0 ? 2 : 1, background: '#ffffff' }} />
          ))}
        </div>

        {/* Buildings */}
        <div className="flex justify-center gap-8 pb-0">
          {graves.map(grave => (
            <button
              key={grave.id}
              onClick={() => setSelectedGrave(grave)}
              className="tombstone-mausoleum cursor-pointer transition-all duration-200 hover:brightness-125 focus:outline-none"
              title={grave.subject}
              aria-label={`View mausoleum for ${grave.subject}`}
              style={{ background: 'none', border: 'none', padding: 0 }}
            >
              <Tombstone
                subject={grave.subject}
                epitaph={grave.epitaph ?? undefined}
                buried_by={grave.buried_by}
                icon={grave.icon}
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
