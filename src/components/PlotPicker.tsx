'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';

// Canonical grid encoding (M1): grid_x = row * GRID_COLS + col, grid_y = 0.
// GRID_COLS must match GraveyardCanvas (DISP_COLS) and the approve route (GRID_COLS).
const COLS = 10; // = GRID_COLS
const ROWS = 10;

export interface PlotPosition {
  grid_x: number; // encoded: row*10 + col
  grid_y: number; // always 0
  col: number;
  row: number;
}

interface PlotPickerProps {
  value: PlotPosition | null;
  onChange: (pos: PlotPosition | null) => void;
}

export default function PlotPicker({ value, onChange }: PlotPickerProps) {
  const [occupied, setOccupied] = useState<Set<string>>(new Set());
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabaseClient
      .from('graves')
      .select('grid_x, grid_y')
      .eq('status', 'approved')
      .not('grid_x', 'is', null)
      .then(({ data }) => {
        const set = new Set<string>();
        for (const g of data ?? []) {
          const col = (g.grid_x as number) % COLS;
          const row = Math.floor((g.grid_x as number) / COLS);
          set.add(`${col},${row}`);
        }
        setOccupied(set);
        setLoading(false);
      });
  }, []);

  const handleClick = (col: number, row: number) => {
    const key = `${col},${row}`;
    if (occupied.has(key)) return; // taken — ignore
    const gx = row * COLS + col;
    // Toggle off if same cell clicked again
    if (value?.col === col && value?.row === row) {
      onChange(null);
    } else {
      onChange({ grid_x: gx, grid_y: 0, col, row });
    }
  };

  return (
    <div>
      {/* Legend */}
      <div className="mb-3 flex flex-wrap gap-4">
        {[
          { color: 'bg-surface border border-border', label: 'Empty' },
          { color: 'bg-dim/30',                       label: 'Taken' },
          { color: 'bg-purple/40 border border-purple', label: 'Your pick' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`h-3 w-3 shrink-0 ${color}`} />
            <span className="text-dim" style={{ fontFamily: 'var(--font-pixel)', fontSize: 5 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-center text-dim" style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }}>
          Loading plots...
        </p>
      ) : (
        <div
          className="grid border border-border"
          style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, background: '#0D0B1E' }}
        >
          {Array.from({ length: ROWS }, (_, row) =>
            Array.from({ length: COLS }, (_, col) => {
              const key    = `${col},${row}`;
              const isTaken    = occupied.has(key);
              const isSelected = value?.col === col && value?.row === row;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleClick(col, row)}
                  disabled={isTaken}
                  title={isTaken ? 'Taken' : `Plot (${col}, ${row})`}
                  className={`aspect-square border-[0.5px] border-border/40 transition-colors ${
                    isSelected
                      ? 'bg-purple/40 border-purple'
                      : isTaken
                        ? 'bg-dim/20 cursor-not-allowed'
                        : 'bg-surface/20 hover:bg-purple/15 cursor-pointer'
                  }`}
                />
              );
            })
          )}
        </div>
      )}

      {/* Skip option */}
      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`transition-colors ${!value ? 'text-muted' : 'text-dim hover:text-muted'}`}
          style={{ fontFamily: 'var(--font-pixel)', fontSize: 5 }}
        >
          {value ? '✕ Clear selection (auto-assign)' : '— Auto-assign my plot'}
        </button>
      </div>

      {value && (
        <p className="mt-2 text-center text-purple" style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }}>
          Plot ({value.col}, {value.row}) selected
        </p>
      )}
    </div>
  );
}
