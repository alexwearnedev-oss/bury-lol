'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import Tombstone, { TIER_DIMS } from './Tombstone';
import GraveModal from './GraveModal';
import type { Grave } from '@/lib/types';

// ── World constants ───────────────────────────────────────────────────────────
const COLS    = 20;
const CELL_W  = 96;   // horizontal spacing per grid cell
const CELL_H  = 150;  // vertical spacing between rows (depth layers)
const GROUND_H = 80;  // grass ground strip height
const SKY_H   = 280;  // sky above top row
const PAD_X   = 80;   // left / right padding

const WORLD_W = COLS * CELL_W + PAD_X * 2; // 2080px
// Height is computed from row count — at least 3 rows of sky+graves+ground

// Pre-baked star positions (deterministic so no SSR/client mismatch)
const STARS = Array.from({ length: 80 }, (_, i) => ({
  x: ((i * 397 + 53)  % (WORLD_W - 10)),
  y: ((i * 211 + 17)  % (SKY_H   - 10)) + 10,
  s: ((i % 3) === 0 ? 2 : 1),
  o: (((i * 31) % 7) + 3) / 10,
}));

// ── Ambient components ────────────────────────────────────────────────────────
function Moon() {
  return (
    <g transform="translate(1900, 60)">
      {/* body */}
      <rect x="0"  y="8"  width="40" height="24" fill="#e8e0c8" />
      <rect x="8"  y="4"  width="24" height="32" fill="#e8e0c8" />
      <rect x="4"  y="6"  width="32" height="28" fill="#e8e0c8" />
      {/* craters */}
      <rect x="10" y="14" width="6"  height="6"  fill="#ccc8b0" />
      <rect x="24" y="20" width="4"  height="4"  fill="#ccc8b0" />
      {/* glow */}
      <rect x="-4" y="4"  width="48" height="32" fill="#e8e0c8" opacity="0.08" />
    </g>
  );
}

function Bat({ style }: { style: React.CSSProperties }) {
  return (
    <div className="bat-fly pointer-events-none absolute" style={style}>
      <svg width="22" height="10" viewBox="0 0 22 10" style={{ imageRendering: 'pixelated' }}
        shapeRendering="crispEdges">
        {/* body */}
        <rect x="9" y="3" width="4" height="5" fill="#1a1828" />
        {/* left wing */}
        <rect x="1" y="1" width="8" height="4" fill="#1a1828" />
        <rect x="0" y="3" width="9" height="2" fill="#1a1828" />
        {/* right wing */}
        <rect x="13" y="1" width="8" height="4" fill="#1a1828" />
        <rect x="13" y="3" width="9" height="2" fill="#1a1828" />
        {/* eyes */}
        <rect x="9"  y="4" width="1" height="1" fill="#cc2222" />
        <rect x="12" y="4" width="1" height="1" fill="#cc2222" />
      </svg>
    </div>
  );
}

function Cobweb({ flip }: { flip?: boolean }) {
  return (
    <svg
      width="90" height="90" viewBox="0 0 90 90"
      style={{ imageRendering: 'pixelated', transform: flip ? 'scaleX(-1)' : undefined }}
      shapeRendering="crispEdges"
      className="pointer-events-none"
    >
      {/* radial lines from corner */}
      <line x1="0" y1="0" x2="88" y2="20" stroke="#555568" strokeWidth="1" opacity="0.6" />
      <line x1="0" y1="0" x2="60" y2="88" stroke="#555568" strokeWidth="1" opacity="0.6" />
      <line x1="0" y1="0" x2="20" y2="88" stroke="#555568" strokeWidth="1" opacity="0.6" />
      <line x1="0" y1="0" x2="88" y2="55" stroke="#555568" strokeWidth="1" opacity="0.6" />
      {/* concentric arcs (stepped pixel style) */}
      {[20, 38, 56, 74].map(r => (
        <g key={r}>
          <line x1={r}      y1="0"      x2={r+6}    y2="0"      stroke="#444456" strokeWidth="1" opacity="0.5" />
          <line x1={r+6}    y1="0"      x2={r+6}    y2="6"      stroke="#444456" strokeWidth="1" opacity="0.5" />
          <line x1="0"      y1={r}      x2="0"      y2={r+6}    stroke="#444456" strokeWidth="1" opacity="0.5" />
          <line x1="0"      y1={r+6}    x2="6"      y2={r+6}    stroke="#444456" strokeWidth="1" opacity="0.5" />
        </g>
      ))}
    </svg>
  );
}

function GrassStrip({ width }: { width: number }) {
  // Pixel art grass tufts repeating every 16px
  const tufts = Array.from({ length: Math.ceil(width / 16) }, (_, i) => i * 16);
  return (
    <svg width={width} height={GROUND_H} viewBox={`0 0 ${width} ${GROUND_H}`}
      style={{ display: 'block', imageRendering: 'pixelated' }} shapeRendering="crispEdges">
      {/* ground fill */}
      <rect x="0" y="8" width={width} height={GROUND_H - 8} fill="#0e1f07" />
      {/* grass line */}
      <rect x="0" y="4" width={width} height="8" fill="#1a3a0a" />
      {/* tufts */}
      {tufts.map(x => (
        <g key={x}>
          <rect x={x+6}  y="0" width="4" height="6" fill="#2a5a14" />
          <rect x={x+4}  y="2" width="8" height="4" fill="#2a5a14" />
          <rect x={x+2}  y="3" width="12" height="3" fill="#1e4410" />
          <rect x={x+10} y="1" width="2" height="4" fill="#336618" />
        </g>
      ))}
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  initialGraves: Grave[];
}

export default function GraveyardCanvas({ initialGraves }: Props) {
  const [graves, setGraves] = useState<Grave[]>(initialGraves);
  const [selected, setSelected] = useState<Grave | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [showHint, setShowHint] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ sx: 0, sy: 0, ox: 0, oy: 0 });
  const touchRef = useRef({ sx: 0, sy: 0, ox: 0, oy: 0 });

  // Compute world height from row count
  const rows = Math.max(3, Math.ceil(graves.length / COLS) + 1);
  const WORLD_H = rows * CELL_H + GROUND_H + SKY_H;

  // Set initial offset so graves are visible (show bottom of world)
  useEffect(() => {
    const vh = containerRef.current?.clientHeight ?? 600;
    setOffset({ x: 0, y: Math.min(0, vh - WORLD_H) });
  }, [WORLD_H]);

  // Clamp helper
  const clamp = useCallback((x: number, y: number) => {
    const vw = containerRef.current?.clientWidth  ?? window.innerWidth;
    const vh = containerRef.current?.clientHeight ?? 600;
    return {
      x: Math.min(0, Math.max(x, vw - WORLD_W)),
      y: Math.min(0, Math.max(y, vh - WORLD_H)),
    };
  }, [WORLD_H]);

  // Mouse drag
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button[data-grave]')) return;
    setDragging(true);
    setShowHint(false);
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y };
  }, [offset]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const { sx, sy, ox, oy } = dragRef.current;
    setOffset(clamp(ox + e.clientX - sx, oy + e.clientY - sy));
  }, [dragging, clamp]);

  const onMouseUp = useCallback(() => setDragging(false), []);

  // Touch drag
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setShowHint(false);
    const t = e.touches[0];
    touchRef.current = { sx: t.clientX, sy: t.clientY, ox: offset.x, oy: offset.y };
  }, [offset]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    const { sx, sy, ox, oy } = touchRef.current;
    setOffset(clamp(ox + t.clientX - sx, oy + t.clientY - sy));
  }, [clamp]);

  // Supabase realtime — new approved graves
  useEffect(() => {
    const ch = supabaseClient
      .channel('canvas:graves')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'graves' }, payload => {
        const g = payload.new as Grave;
        if (g.status === 'approved' && g.tier !== 4) {
          setGraves(prev => {
            if (prev.find(p => p.id === g.id)) return prev;
            setNewIds(ids => new Set(Array.from(ids).concat(g.id)));
            setTimeout(() => setNewIds(ids => { const n = new Set(ids); n.delete(g.id); return n; }), 3000);
            return [...prev, g];
          });
        }
      })
      .subscribe();
    return () => { supabaseClient.removeChannel(ch); };
  }, []);

  // Ground Y = distance from world top to grass surface
  const groundY = WORLD_H - GROUND_H;

  return (
    <>
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        style={{
          flex: 1,
          minHeight: 560,
          cursor: dragging ? 'grabbing' : 'grab',
          background: '#08080f',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => {}}
      >
        {/* ── The world ──────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            width: WORLD_W,
            height: WORLD_H,
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            willChange: 'transform',
          }}
        >
          {/* Sky */}
          <div style={{ position: 'absolute', inset: 0, background: '#08080f' }}>
            {/* Stars */}
            {STARS.map((s, i) => (
              <div key={i} style={{
                position: 'absolute', left: s.x, top: s.y,
                width: s.s, height: s.s,
                background: '#ffffff', opacity: s.o,
              }} />
            ))}
            <Moon />
          </div>

          {/* Fog strip at ground level */}
          <div style={{
            position: 'absolute',
            bottom: GROUND_H,
            left: 0,
            width: WORLD_W,
            height: 36,
            background: 'linear-gradient(to top, rgba(160,200,140,0.06), transparent)',
            pointerEvents: 'none',
          }} />

          {/* Ground */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: WORLD_W, height: GROUND_H }}>
            <GrassStrip width={WORLD_W} />
          </div>

          {/* Bats */}
          <Bat style={{ animationDuration: '22s', top: SKY_H * 0.3 }} />
          <Bat style={{ animationDuration: '31s', top: SKY_H * 0.55, animationDelay: '-12s' }} />
          <Bat style={{ animationDuration: '18s', top: SKY_H * 0.18, animationDelay: '-7s' }} />

          {/* Tombstones */}
          {graves.map(grave => {
            if (grave.grid_x === null || grave.grid_y === null) return null;
            const dims = TIER_DIMS[grave.tier] ?? TIER_DIMS[2];
            const x = PAD_X + grave.grid_x * CELL_W;
            const y = groundY - grave.grid_y * CELL_H - dims.h;
            const isNew = newIds.has(grave.id);
            return (
              <button
                key={grave.id}
                data-grave="1"
                onClick={() => setSelected(grave)}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  zIndex: 10,
                  transition: 'filter 0.15s',
                }}
                className={isNew ? 'animate-pulse' : ''}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.35)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = ''; }}
                title={`${grave.subject}${grave.epitaph ? ` — ${grave.epitaph}` : ''}`}
                aria-label={`View grave for ${grave.subject}`}
              >
                <Tombstone
                  subject={grave.subject}
                  epitaph={grave.epitaph ?? undefined}
                  buried_by={grave.buried_by}
                  tier={grave.tier}
                />
              </button>
            );
          })}
        </div>

        {/* Cobwebs — fixed to viewport corners, not the world */}
        <div className="pointer-events-none absolute left-0 top-0"><Cobweb /></div>
        <div className="pointer-events-none absolute right-0 top-0"><Cobweb flip /></div>

        {/* Drag hint */}
        {showHint && (
          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 animate-pulse">
            <span className="text-stone/40" style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}>
              drag to explore
            </span>
          </div>
        )}

        {/* Empty state */}
        {graves.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-center text-stone" style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, lineHeight: 2 }}>
              Nothing buried yet.<br />Suspicious.
            </p>
          </div>
        )}
      </div>

      {selected && (
        <GraveModal grave={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
