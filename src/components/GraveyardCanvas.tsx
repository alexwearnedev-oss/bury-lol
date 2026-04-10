'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import GraveModal from './GraveModal';
import type { Grave } from '@/lib/types';

// ── Grid constants ─────────────────────────────────────────────────────────────
/**
 * Canonical grid encoding (M1):
 *   grid_x = row * GRID_COLS + col   (integer 0–99)
 *   grid_y = 0                        (always; second dimension is unused)
 *
 * GRID_COLS = DISP_COLS = 10. This constant must match the approve route and
 * PlotPicker. Change only with a coordinated migration.
 */
const DISP_COLS  = 10;
/** Two-cell buffer ring of forest trees around the cemetery. */
const BG_EXT     = 2;
const TILE_W     = 128;
const TILE_H     = 64;
const WALL_H     = 12;
const CLIFF_H    = 6000;  // rocky cliff depth — extends to bottom of screen
/** Cemetery is always exactly 10×10 plots — finite and fixed. Never changes. */
const DISP_ROWS  = 10;
const CAM_MARGIN = 60;

// ── Helpers ────────────────────────────────────────────────────────────────────
/** Decode canonical grid_x to display (col, row). grid_y is always 0 and ignored. */
function dbToDisp(gx: number) {
  return { col: gx % DISP_COLS, row: Math.floor(gx / DISP_COLS) };
}
function isoOff(col: number, row: number) {
  return { x: (col - row) * TILE_W / 2, y: (col + row) * TILE_H / 2 };
}
/** World-space tile centre (isometric). Screen = origin + cam + world * zoom via parent SVG transform. */
function toWorld(col: number, row: number) {
  return isoOff(col, row);
}

function clampCamera(
  cam: { x: number; y: number },
  zoom: number,
  originX: number,
  originY: number,
  vw: number,
  vh: number,
  minWX: number,
  maxWX: number,
  minWY: number,
  maxWY: number,
  margin: number,
): { x: number; y: number } {
  let minCx = margin - originX - minWX * zoom;
  let maxCx = vw - margin - originX - maxWX * zoom;
  let minCy = margin - originY - minWY * zoom;
  let maxCy = vh - margin - originY - maxWY * zoom;
  if (minCx > maxCx) {
    const m = (minCx + maxCx) / 2;
    minCx = maxCx = m;
  }
  if (minCy > maxCy) {
    const m = (minCy + maxCy) / 2;
    minCy = maxCy = m;
  }
  return {
    x: Math.min(Math.max(cam.x, minCx), maxCx),
    y: Math.min(Math.max(cam.y, minCy), maxCy),
  };
}
function twemojiUrl(emoji: string): string {
  const cp = Array.from(emoji)
    .map(c => c.codePointAt(0)!)
    .filter(n => n !== 0xfe0f)
    .map(n => n.toString(16))
    .join('-');
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${cp}.svg`;
}

// ── World-space backdrop (pans/zooms with grid; sky only above horizonY) ──
const MEADOW_PALETTE = ['#0f1c08', '#16280c', '#1e3810', '#253E14', '#2D6418', '#3A7820', '#234f14'];

function worldBackdropData(horizonY: number, minX: number, maxX: number, maxY: number) {
  const pad = 200;
  const grassLeft = minX - pad;
  const grassRight = maxX + pad;
  const grassW = Math.max(grassRight - grassLeft, 400);
  const stars = Array.from({ length: 64 }, (_, i) => {
    const xf = ((i * 397 + 53) % 997) / 997;
    const yf = ((i * 211 + 17) % 331) / 331;
    const yTop = horizonY - 640;
    const yBot = horizonY - 20;
    const y = yTop + yf * (yBot - yTop);
    const x = grassLeft + xf * grassW;
    const s = i % 5 === 0 ? 2 : 1;
    const o = (((i * 31) % 7) + 2) / 11;
    return { x, y, s, o, i };
  });
  const hills = Array.from({ length: 12 }, (_, i) => {
    const n = i / 11;
    const x = grassLeft + n * grassW + Math.sin(i * 1.9) * 40;
    const y = horizonY - 5 + (i % 3) * 3 + Math.sin(i * 1.1) * 4;
    const rx = 36 + (i % 5) * 16;
    const ry = 12 + (i % 4) * 5;
    const fill = i % 3 === 0 ? '#040608' : i % 3 === 1 ? '#060a08' : '#05080c';
    const opacity = 0.16 + (i % 4) * 0.03;
    return { x, y, rx, ry, fill, opacity, key: i };
  });
  const bladeN = Math.min(340, 140 + Math.floor(grassW * 0.22));
  const blades = Array.from({ length: bladeN }, (_, i) => {
    const xf = ((i * 997 + 101) % 991) / 991;
    const raw = ((i * 523 + 37) % 1000) / 1000;
    const bottomBias = Math.pow(raw, 1.15);
    const groundH = Math.max(140, maxY - horizonY + 160);
    const y0 = horizonY + 14 + bottomBias * groundH;
    const x0 = grassLeft + xf * grassW + Math.sin(i * 0.35 + 0.6) * 8;
    const bladeH = 2 + (i % 17) + bottomBias * 14;
    const lean = ((i * 11) % 15) - 7;
    const col = MEADOW_PALETTE[i % MEADOW_PALETTE.length];
    const opacity = 0.1 + bottomBias * 0.45 + ((i % 6) * 0.024);
    const sw = i % 9 === 0 ? 1.25 : i % 6 === 0 ? 1 : 0.8;
    return { x0, y0, bladeH, lean, col, opacity, sw };
  });
  return { stars, hills, blades };
}

function WorldBackdrop({
  horizonY,
  minX,
  maxX,
  maxY,
}: {
  horizonY: number;
  minX: number;
  maxX: number;
  maxY: number;
}) {
  const { stars } = useMemo(
    () => worldBackdropData(horizonY, minX, maxX, maxY),
    [horizonY, minX, maxX, maxY],
  );
  const moonX = maxX + TILE_W * 0.22;
  const moonY = horizonY - TILE_H * 6.2;

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Moon — world-locked */}
      <g transform={`translate(${moonX}, ${moonY})`}>
        <rect x="0" y="8" width="40" height="24" fill="#e8e0c8" />
        <rect x="8" y="4" width="24" height="32" fill="#e8e0c8" />
        <rect x="4" y="6" width="32" height="28" fill="#e8e0c8" />
        <rect x="10" y="14" width="6" height="6" fill="#ccc8b0" />
        <rect x="24" y="20" width="4" height="4" fill="#ccc8b0" />
      </g>
      {stars.map(s => (
        <rect key={s.i} x={s.x} y={s.y} width={s.s} height={s.s} fill="#fff" opacity={s.o} />
      ))}
    </g>
  );
}

// ── Pixel werewolf — animated canvas sprite, ported from pixel art HTML ───────
const WOLF_PX = 2;          // pixel scale (each sprite pixel = 2×2 canvas pixels)
const WOLF_CW = 24 * WOLF_PX;  // canvas width  = 48px
const WOLF_CH = 28 * WOLF_PX;  // canvas height = 56px
const WOLF_FEET_Y = 22 * WOLF_PX; // CSS y of feet inside canvas = 44px

const WOLF_PAL = {
  fur:   '#6b4f8a', furD:  '#4a3060', furDD: '#2e1a42',
  snout: '#8a6898', nose:  '#1a0a00', eye:   '#ff3333',
  eyeG:  '#ff8866', claw:  '#c8a060', mouth: '#3d1a2a',
  earIn: '#7a3050', belly: '#5a4070',
} as const;

function drawWolfFrame(
  ctx: CanvasRenderingContext2D,
  tick: number,
  walking: boolean,
  facing: 'r' | 'l',
) {
  const S = WOLF_PX;
  const P = WOLF_PAL;

  function px(x: number, y: number, color: string, w = 1, h = 1) {
    ctx.fillStyle = color;
    ctx.fillRect(x * S, y * S, w * S, h * S);
  }

  ctx.clearRect(0, 0, WOLF_CW, WOLF_CH);
  ctx.save();
  if (facing === 'l') {
    ctx.translate(WOLF_CW, 0);
    ctx.scale(-1, 1);
  }

  // Animation params
  let legL = 0, legR = 0, armL = 0, armR = 0, headY = 0, tailAng = 0;
  if (walking) {
    const s = Math.sin(tick * 0.18);
    legL    = Math.round(s * 1.5);
    legR    = Math.round(-s * 1.5);
    armL    = Math.round(-s * 1.5);
    armR    = Math.round(s * 1.5);
    headY   = Math.round(Math.abs(Math.sin(tick * 0.18)) * -0.5);
    tailAng = Math.round(Math.sin(tick * 0.12) * 2);
  } else {
    const b = Math.sin(tick * 0.05);
    headY   = Math.round(b * 0.6);
    tailAng = Math.round(Math.sin(tick * 0.07) * 1.5);
    armL    = Math.round(b * 0.5);
    armR    = Math.round(-b * 0.5);
  }

  const tx = 4, ty = 4;

  // Tail
  const tx2 = tx + 18, ty2 = ty + 9 + tailAng;
  px(tx2,   ty2,   P.furD);  px(tx2+1, ty2,   P.furD);
  px(tx2+2, ty2-1, P.furD);  px(tx2+2, ty2-2, P.fur);
  px(tx2+3, ty2-3, P.fur);   px(tx2+2, ty2-4, P.furD);
  px(tx2+1, ty2-5, P.furDD);

  // Left leg
  const llx = tx + 3, lly = ty + 13;
  px(llx,   lly,             P.furD,  3, 2);
  px(llx,   lly + 2,         P.furDD, 2, 2 + legL);
  px(llx-1, lly + 4 + legL,  P.furDD, 4, 1);
  px(llx-1, lly + 5 + legL,  P.claw);
  px(llx+1, lly + 5 + legL,  P.claw);
  px(llx+2, lly + 5 + legL,  P.claw);

  // Right leg
  const rlx = tx + 9, rly = ty + 13;
  px(rlx,   rly,             P.furD,  3, 2);
  px(rlx,   rly + 2,         P.furDD, 2, 2 + legR);
  px(rlx-1, rly + 4 + legR,  P.furDD, 4, 1);
  px(rlx-1, rly + 5 + legR,  P.claw);
  px(rlx+1, rly + 5 + legR,  P.claw);
  px(rlx+2, rly + 5 + legR,  P.claw);

  // Body
  const bx = tx + 1, by = ty + 5;
  px(bx,      by,     P.fur,   14, 9);
  px(bx+3,    by+3,   P.belly,  7, 5);
  px(bx,      by,     P.furD,   2, 3);
  px(bx+12,   by,     P.furD,   2, 3);
  px(bx,      by-1,   P.fur,    4, 2);
  px(bx+10,   by-1,   P.fur,    4, 2);
  px(bx+5,    by+1,   P.furD,   3, 2);

  // Arms (normal idle/walk pose)
  const alx = tx - 1, aly = ty + 6;
  px(alx,   aly,             P.fur,   2, 5 + armL);
  px(alx-1, aly + 5 + armL,  P.furD,  3, 2);
  px(alx-1, aly + 7 + armL,  P.claw);
  px(alx,   aly + 7 + armL,  P.claw);
  px(alx+1, aly + 7 + armL,  P.claw);

  const arx = tx + 13, ary = ty + 6;
  px(arx,   ary,             P.fur,   2, 5 + armR);
  px(arx,   ary + 5 + armR,  P.furD,  3, 2);
  px(arx,   ary + 7 + armR,  P.claw);
  px(arx+1, ary + 7 + armR,  P.claw);
  px(arx+2, ary + 7 + armR,  P.claw);

  // Head
  const hx = tx + 2, hy = ty - 3 + headY;

  // Ears
  px(hx+1, hy-3, P.furD,  2, 3);
  px(hx+7, hy-3, P.furD,  2, 3);
  px(hx+1, hy-2, P.furDD, 1, 2);
  px(hx+8, hy-2, P.furDD, 1, 2);
  px(hx+2, hy-3, P.earIn, 1, 1);
  px(hx+7, hy-3, P.earIn, 1, 1);

  // Head base
  px(hx,   hy,   P.fur,   12, 6);
  px(hx+1, hy-1, P.fur,   10, 2);
  px(hx,   hy,   P.furD,  12, 1);

  // Snout
  const sx = hx + 5, sy = hy + 2;
  px(sx,   sy,   P.snout, 6, 3);
  px(sx+1, sy+2, P.furDD, 4, 1);
  px(sx+1, sy,   P.nose,  2, 1);
  px(sx,   sy+1, P.nose,  1, 1);
  px(sx+3, sy+1, P.nose,  1, 1);

  // Eyes
  px(hx+1, hy+1, P.eye,   2, 2);
  px(hx+2, hy+1, P.eyeG,  1, 1);
  px(hx+8, hy+1, P.eye,   2, 2);
  px(hx+9, hy+1, P.eyeG,  1, 1);
  px(hx,   hy,   P.furDD, 2, 1);
  px(hx+8, hy,   P.furDD, 3, 1);

  ctx.restore();
}

function PixelWerewolfCanvas({ walking, facing }: { walking: boolean; facing: 'r' | 'l' }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const walkingRef = useRef(walking);
  const facingRef  = useRef(facing);
  const tickRef    = useRef(0);
  const rafRef     = useRef(0);

  useEffect(() => { walkingRef.current = walking; }, [walking]);
  useEffect(() => { facingRef.current  = facing;  }, [facing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    function loop() {
      tickRef.current++;
      drawWolfFrame(ctx!, tickRef.current, walkingRef.current, facingRef.current);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={WOLF_CW}
      height={WOLF_CH}
      style={{ imageRendering: 'pixelated', display: 'block' }}
    />
  );
}

// ── Werewolf walker — moves between random graveyard tiles every few seconds ──
function WerewolfWalker({ totalRows }: { totalRows: number }) {
  const [pos, setPos]         = useState<{ x: number; y: number } | null>(null);
  const [facing, setFacing]   = useState<'r' | 'l'>('r');
  const [walking, setWalking] = useState(false);
  const prevX = useRef(0);

  useEffect(() => {
    const pick = () => {
      const col = Math.floor(Math.random() * DISP_COLS);
      const row = Math.floor(Math.random() * Math.max(1, totalRows));
      return toWorld(col, row);
    };
    const init = pick();
    prevX.current = init.x;
    setPos(init);

    const id = setInterval(() => {
      const next = pick();
      setFacing(next.x >= prevX.current ? 'r' : 'l');
      prevX.current = next.x;
      setPos(next);
      setWalking(true);
      // Transition is 4s — stop walk anim just before it ends
      const tid = setTimeout(() => setWalking(false), 3800);
      return () => clearTimeout(tid);
    }, 4200);
    return () => clearInterval(id);
  }, [totalRows]);

  if (!pos) return null;

  return (
    <g
      style={{
        transform: `translate(${pos.x}px, ${pos.y - TILE_H / 3}px)`,
        transition: 'transform 4s ease-in-out',
      }}
    >
      <foreignObject
        x={-WOLF_CW / 2}
        y={-WOLF_FEET_Y}
        width={WOLF_CW}
        height={WOLF_CH}
        style={{ overflow: 'visible', pointerEvents: 'none' }}
      >
        <PixelWerewolfCanvas walking={walking} facing={facing} />
      </foreignObject>
    </g>
  );
}

// ── Ambient components ─────────────────────────────────────────────────────────
function Bat({ style }: { style: React.CSSProperties }) {
  return (
    <div className="bat-fly pointer-events-none absolute" style={style}>
      <svg width="22" height="10" viewBox="0 0 22 10" style={{ imageRendering: 'pixelated' }} shapeRendering="crispEdges">
        <rect x="9"  y="3" width="4" height="5" fill="#1a1828" />
        <rect x="1"  y="1" width="8" height="4" fill="#1a1828" />
        <rect x="0"  y="3" width="9" height="2" fill="#1a1828" />
        <rect x="13" y="1" width="8" height="4" fill="#1a1828" />
        <rect x="13" y="3" width="9" height="2" fill="#1a1828" />
        <rect x="9"  y="4" width="1" height="1" fill="#cc2222" />
        <rect x="12" y="4" width="1" height="1" fill="#cc2222" />
      </svg>
    </div>
  );
}
function Cobweb({ flip }: { flip?: boolean }) {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" className="pointer-events-none"
      style={{ imageRendering: 'pixelated', transform: flip ? 'scaleX(-1)' : undefined }}
      shapeRendering="crispEdges">
      <line x1="0" y1="0" x2="88" y2="20" stroke="#555568" strokeWidth="1" opacity="0.6" />
      <line x1="0" y1="0" x2="60" y2="88" stroke="#555568" strokeWidth="1" opacity="0.6" />
      <line x1="0" y1="0" x2="20" y2="88" stroke="#555568" strokeWidth="1" opacity="0.6" />
      <line x1="0" y1="0" x2="88" y2="55" stroke="#555568" strokeWidth="1" opacity="0.6" />
      {[20, 38, 56, 74].map(r => (
        <g key={r}>
          <line x1={r}   y1="0"   x2={r+6} y2="0"   stroke="#444456" strokeWidth="1" opacity="0.5" />
          <line x1={r+6} y1="0"   x2={r+6} y2="6"   stroke="#444456" strokeWidth="1" opacity="0.5" />
          <line x1="0"   y1={r}   x2="0"   y2={r+6} stroke="#444456" strokeWidth="1" opacity="0.5" />
          <line x1="0"   y1={r+6} x2="6"   y2={r+6} stroke="#444456" strokeWidth="1" opacity="0.5" />
        </g>
      ))}
    </svg>
  );
}
function HorrorCross({ cx, cy, sc }: { cx: number; cy: number; sc: number }) {
  return (
    <g shapeRendering="crispEdges" opacity={0.36} style={{ pointerEvents: 'none' }}>
      <rect x={cx - sc} y={cy - 54 * sc} width={2 * sc} height={58 * sc} fill="#100c08" />
      <rect x={cx - 15 * sc} y={cy - 40 * sc} width={30 * sc} height={3 * sc} fill="#100c08" />
    </g>
  );
}

function CreepyObelisk({ cx, cy, sc }: { cx: number; cy: number; sc: number }) {
  return (
    <g shapeRendering="crispEdges" opacity={0.3} style={{ pointerEvents: 'none' }}>
      <polygon points={`${cx},${cy - 72 * sc} ${cx + 10 * sc},${cy + 6 * sc} ${cx - 10 * sc},${cy + 6 * sc}`} fill="#0a0606" />
      <rect x={cx - 7 * sc} y={cy + 6 * sc} width={14 * sc} height={6 * sc} fill="#120c0c" />
    </g>
  );
}

function DeadStump({ cx, cy, sc }: { cx: number; cy: number; sc: number }) {
  return (
    <g shapeRendering="crispEdges" opacity={0.42} style={{ pointerEvents: 'none' }}>
      <rect x={cx - 6 * sc} y={cy - 14 * sc} width={12 * sc} height={16 * sc} fill="#1a120c" />
      <rect x={cx - 8 * sc} y={cy - 11 * sc} width={5 * sc} height={6 * sc} fill="#241810" />
      <rect x={cx + 3 * sc} y={cy - 9 * sc} width={4 * sc} height={4 * sc} fill="#1c140e" />
    </g>
  );
}

/** Chunky “fat pixel” forest tree — integer steps in `u` for crisp readable silhouettes. */
function ForestTree({
  cx,
  cy,
  sc,
  flip,
  variant,
  vyScale,
}: {
  cx: number;
  cy: number;
  sc: number;
  flip?: boolean;
  variant: 0 | 1 | 2;
  vyScale: number;
}) {
  const f = flip ? -1 : 1;
  const u = 5 * sc;
  const dk = '#152214';
  const md = '#1c3018';
  const hi = '#264a1e';
  const lt = '#345a28';
  const rim = '#3d6a30';
  const trunk = '#24160e';
  const trunkHi = '#3a2818';

  /** Layer: full block + windward rim highlight (chunky pixels). */
  const layer = (lid: string, x: number, y: number, wu: number, hu: number, fill: string, rimF: string) => (
    <g key={lid}>
      <rect x={cx + x * u} y={cy + y * u} width={wu * u} height={hu * u} fill={fill} />
      <rect
        x={cx + x * u + (f > 0 ? 0 : (wu - 1) * u)}
        y={cy + y * u}
        width={u}
        height={hu * u}
        fill={rimF}
        opacity={0.38}
      />
    </g>
  );

  let body: ReactNode;
  if (variant === 0) {
    body = (
      <>
        <rect x={cx - u} y={cy - 6 * u} width={2 * u} height={6 * u} fill={trunk} />
        <rect x={cx - u} y={cy - 6 * u} width={u} height={6 * u} fill={trunkHi} opacity={0.45} />
        {layer('p0', -8, -9, 16, 3, dk, md)}
        {layer('p1', -7 + f, -12, 14, 3, md, hi)}
        {layer('p2', -6 - f, -15, 12, 3, hi, lt)}
        {layer('p3', -5, -18, 10, 3, lt, rim)}
        {layer('p4', -4, -21, 8, 3, hi, lt)}
        {layer('p5', -3, -24, 6, 3, md, hi)}
        {layer('p6', -2, -27, 4, 3, lt, rim)}
        {layer('p7', -1, -30, 2, 3, hi, lt)}
        {layer('p8', -1, -33, 2, 2, md, hi)}
      </>
    );
  } else if (variant === 1) {
    body = (
      <>
        <rect x={cx - u} y={cy - 5 * u} width={2 * u} height={5 * u} fill={trunk} />
        <rect x={cx - u} y={cy - 5 * u} width={u} height={5 * u} fill={trunkHi} opacity={0.4} />
        {layer('w0', -9, -8, 18, 2, dk, md)}
        {layer('w1', -8 + f * 2, -10, 16, 3, md, hi)}
        {layer('w2', -7, -13, 14, 3, hi, lt)}
        {layer('w3', -9, -15, 5, 3, lt, rim)}
        {layer('w4', 4 - f, -15, 5, 3, md, hi)}
        {layer('w5', -6, -18, 12, 3, dk, md)}
        {layer('w6', -5 - f, -21, 10, 3, hi, lt)}
        {layer('w7', -3, -24, 6, 3, lt, rim)}
        {layer('w8', -2, -27, 4, 3, hi, lt)}
        {layer('w9', -1, -30, 2, 3, md, hi)}
      </>
    );
  } else {
    body = (
      <>
        <rect x={cx - u} y={cy - 4 * u} width={2 * u} height={4 * u} fill={trunk} />
        {layer('b0', -6, -7, 12, 4, dk, md)}
        {layer('b1', -5 + f, -11, 10, 4, md, hi)}
        {layer('b2', -4, -15, 8, 4, hi, lt)}
        {layer('b3', -3, -19, 6, 4, lt, rim)}
        {layer('b4', -2, -23, 4, 4, hi, lt)}
        {layer('b5', -1, -27, 2, 3, md, hi)}
        {layer('b6', -1, -30, 2, 2, lt, rim)}
        {layer('b7', -7 - f * 2, -9, 4, 3, hi, lt)}
        {layer('b8', 3 + f * 2, -10, 4, 3, md, hi)}
        {layer('b9', -5, -6, 3, 2, lt, rim)}
      </>
    );
  }

  return (
    <g
      shapeRendering="crispEdges"
      style={{ pointerEvents: 'none' }}
      transform={`translate(${cx},${cy}) scale(1,${vyScale}) translate(${-cx},${-cy})`}
    >
      {body}
    </g>
  );
}

function DeadTree({ cx, cy, sc, flip }: { cx: number; cy: number; sc: number; flip?: boolean }) {
  const bark = '#261808';
  const twig = '#3C2410';
  const f    = flip ? -1 : 1;  // branch direction multiplier
  return (
    <g shapeRendering="crispEdges" strokeLinecap="round">
      {/* Root flare — wider base */}
      <rect x={cx-4.5*sc} y={cy-10*sc} width={9*sc}  height={10*sc} fill={bark} />
      <rect x={cx-3.5*sc} y={cy-14*sc} width={7*sc}  height={4*sc}  fill={bark} />
      {/* Main trunk */}
      <rect x={cx-2.5*sc} y={cy-64*sc} width={5*sc}  height={50*sc} fill={bark} />
      {/* Upper trunk taper */}
      <rect x={cx-1.5*sc} y={cy-74*sc} width={3*sc}  height={10*sc} fill={bark} />

      {/* Branch 1 — lower, angles up & out diagonally */}
      <line x1={cx}          y1={cy-26*sc}
            x2={cx-f*20*sc}  y2={cy-48*sc}
            stroke={bark} strokeWidth={3.5*sc} />
      {/* Branch 1 fork */}
      <line x1={cx-f*20*sc}  y1={cy-48*sc}
            x2={cx-f*30*sc}  y2={cy-43*sc}
            stroke={twig} strokeWidth={2*sc} />
      <line x1={cx-f*20*sc}  y1={cy-48*sc}
            x2={cx-f*25*sc}  y2={cy-57*sc}
            stroke={twig} strokeWidth={2*sc} />

      {/* Branch 2 — mid, opposite side, angles upward */}
      <line x1={cx}          y1={cy-40*sc}
            x2={cx+f*16*sc}  y2={cy-58*sc}
            stroke={bark} strokeWidth={3*sc} />
      {/* Branch 2 fork */}
      <line x1={cx+f*16*sc}  y1={cy-58*sc}
            x2={cx+f*24*sc}  y2={cy-54*sc}
            stroke={twig} strokeWidth={1.8*sc} />
      <line x1={cx+f*16*sc}  y1={cy-58*sc}
            x2={cx+f*20*sc}  y2={cy-66*sc}
            stroke={twig} strokeWidth={1.8*sc} />

      {/* Branch 3 — upper, angled back */}
      <line x1={cx}          y1={cy-56*sc}
            x2={cx-f*13*sc}  y2={cy-70*sc}
            stroke={bark} strokeWidth={2.2*sc} />
      {/* Branch 3 twigs */}
      <line x1={cx-f*13*sc}  y1={cy-70*sc}
            x2={cx-f*20*sc}  y2={cy-67*sc}
            stroke={twig} strokeWidth={1.4*sc} />
      <line x1={cx-f*13*sc}  y1={cy-70*sc}
            x2={cx-f*15*sc}  y2={cy-77*sc}
            stroke={twig} strokeWidth={1.4*sc} />

      {/* Top crown sprigs */}
      <line x1={cx}          y1={cy-64*sc}
            x2={cx+f*7*sc}   y2={cy-74*sc}
            stroke={twig} strokeWidth={1.8*sc} />
      <line x1={cx}          y1={cy-67*sc}
            x2={cx-f*5*sc}   y2={cy-75*sc}
            stroke={twig} strokeWidth={1.4*sc} />
      <line x1={cx}          y1={cy-70*sc}
            x2={cx+f*2*sc}   y2={cy-78*sc}
            stroke={twig} strokeWidth={1.2*sc} />
    </g>
  );
}
// ── Cliff face — rocky wall below cemetery perimeter ─────────────────────────
// ax,ay → bx,by is the TOP edge of the face; depth extends straight down.
// Features use absolute pixel depths so they look right at any CLIFF_H.
function CliffFace({
  ax, ay, bx, by, depth, seed,
}: { ax: number; ay: number; bx: number; by: number; depth: number; seed: number }) {
  // LCG hash — deterministic pseudo-random from seed + index
  const h = (n: number) => (((n * 1103515245 + 12345) >>> 0) % 997) / 997;

  // Point on the parallelogram face:
  //   u ∈ [0,1] along the top edge, d = absolute pixel depth from top
  const fX = (u: number) => ax + (bx - ax) * u;
  const fY = (u: number, d: number) => ay + (by - ay) * u + d;
  const pts = (u0: number, d0: number, u1: number, d1: number) =>
    `${fX(u0)},${fY(u0, d0)} ${fX(u1)},${fY(u1, d0)} ${fX(u1)},${fY(u1, d1)} ${fX(u0)},${fY(u0, d1)}`;

  // Colour palette — earthy dark rock
  const C = {
    void:    '#060403',
    deep:    '#0c0908',
    rock1:   '#131009',
    rock2:   '#1a160e',
    rock3:   '#222019',  // lighter stratum
    rock4:   '#2a2416',  // near-surface warm rock
    ledgeT:  '#362e1e',  // ledge top face (lit)
    ledgeS:  '#080605',  // ledge underside (shadow)
    crack:   '#030201',
    wet:     '#0b0e14',  // mineral/damp streak
    rim:     '#3e3224',  // top-edge highlight
    moss:    '#151f0a',  // mossy patches near top
  };

  // Strata bands — absolute depths in world px, varied thickness
  const strata: { d1: number; d2: number; col: string }[] = [
    { d1: 0,   d2: 18,  col: C.rock3 },
    { d1: 18,  d2: 40,  col: C.deep  },
    { d1: 40,  d2: 65,  col: C.rock2 },
    { d1: 65,  d2: 95,  col: C.rock1 },
    { d1: 95,  d2: 128, col: C.rock3 },
    { d1: 128, d2: 158, col: C.deep  },
    { d1: 158, d2: 195, col: C.rock2 },
    { d1: 195, d2: 240, col: C.rock4 },
    { d1: 240, d2: 280, col: C.rock1 },
    { d1: 280, d2: 335, col: C.rock2 },
    { d1: 335, d2: 395, col: C.rock3 },
    { d1: 395, d2: 460, col: C.deep  },
    { d1: 460, d2: 540, col: C.rock1 },
    { d1: 540, d2: depth, col: C.void },
  ];

  // Ledges — horizontal shelf effect (lit top + shadow underside)
  const ledges = [
    { d: 52,  litH: 5,  shadeH: 16 },
    { d: 145, litH: 4,  shadeH: 12 },
    { d: 268, litH: 6,  shadeH: 20 },
    { d: 410, litH: 4,  shadeH: 14 },
  ];

  // Rock outcroppings — blocky protrusions at ledge levels
  // Each one: a small filled rect on the face that looks like a boulder jutting out
  const outcrops = [
    { u: 0.18 + h(seed*5)*0.12,  d: 48,  w: 10, hh: 18, col: C.rock4 },
    { u: 0.62 + h(seed*7)*0.18,  d: 45,  w: 8,  hh: 14, col: C.rock3 },
    { u: 0.35 + h(seed*11)*0.20, d: 140, w: 12, hh: 22, col: C.rock2 },
    { u: 0.78 + h(seed*13)*0.12, d: 142, w: 7,  hh: 16, col: C.rock4 },
    { u: 0.22 + h(seed*17)*0.15, d: 262, w: 9,  hh: 20, col: C.rock3 },
    { u: 0.55 + h(seed*19)*0.22, d: 265, w: 11, hh: 18, col: C.rock2 },
  ];

  // Cracks — vertical/angled with branching
  const numCracks = 4 + (seed % 5);
  const cracks = Array.from({ length: numCracks }, (_, k) => ({
    u:      0.06 + h(seed * 37 + k * 53) * 0.88,
    dStart: h(seed * 29 + k * 47) * 50,
    dLen:   70 + h(seed * 43 + k * 61) * 360,
    lean:   (h(seed * 71 + k * 41) - 0.5) * 12,
  }));

  // Crevice shadows — scattered dark patches
  const numBumps = 12 + (seed % 6);
  const bumps = Array.from({ length: numBumps }, (_, b) => ({
    u: 0.03 + h(seed * 97 + b * 31) * 0.94,
    d: 8    + h(seed * 83 + b * 53) * 520,
    w: 6    + h(seed * 107 + b * 19) * 20,
    hh: 3   + (b % 6) * 3,
  }));

  // Wet / mineral streaks going straight down
  const streaks = Array.from({ length: 4 }, (_, w) => ({
    u:    0.12 + h(seed * 61 + w * 37) * 0.76,
    dLen: 70   + w * 90,
  }));

  // Moss patches — near the very top edge
  const mossPts = Array.from({ length: 5 }, (_, m) => ({
    u: 0.08 + h(seed * 131 + m * 41) * 0.84,
    d: 2    + h(seed * 149 + m * 23) * 22,
    w: 5    + h(seed * 157 + m * 61) * 12,
  }));

  return (
    <g shapeRendering="crispEdges" style={{ pointerEvents: 'none' }}>
      {/* Base fill */}
      <polygon points={pts(0, 0, 1, depth)} fill={C.rock1} />

      {/* Strata bands */}
      {strata.map(({ d1, d2, col }, i) => (
        <polygon key={`s${i}`} points={pts(0, d1, 1, d2)} fill={col} opacity={0.72} />
      ))}

      {/* Ledges — lit top + shadow underside */}
      {ledges.map(({ d, litH, shadeH }, i) => (
        <g key={`l${i}`}>
          <polygon points={pts(0, d, 1, d + litH)}          fill={C.ledgeT} opacity={0.80} />
          <polygon points={pts(0, d + litH, 1, d + litH + shadeH)} fill={C.ledgeS} opacity={0.72} />
        </g>
      ))}

      {/* Rock outcroppings */}
      {outcrops.map(({ u, d, w, hh: oh, col }, i) => (
        <polygon key={`o${i}`}
          points={`${fX(u) - w},${fY(u, d)} ${fX(u) + w},${fY(u, d)} ${fX(u) + w},${fY(u, d + oh)} ${fX(u) - w},${fY(u, d + oh)}`}
          fill={col} opacity={0.65}
        />
      ))}

      {/* Cracks with branching */}
      {cracks.map(({ u, dStart, dLen, lean }, k) => {
        const x1 = fX(u), y1 = fY(u, dStart);
        const x2 = fX(u) + lean, y2 = fY(u, dStart + dLen);
        const brX = x1 + lean * 0.4 + (k % 2 === 0 ? 5 : -5);
        const brY = fY(u, dStart + dLen * 0.45);
        return (
          <g key={`c${k}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.crack} strokeWidth={1.2} opacity={0.65} />
            <line x1={x1 + lean * 0.15} y1={fY(u, dStart + dLen * 0.2)} x2={brX} y2={brY}
              stroke={C.crack} strokeWidth={0.8} opacity={0.40} />
          </g>
        );
      })}

      {/* Crevice shadows */}
      {bumps.map(({ u, d, w: bw, hh: bh }, b) => (
        <rect key={`b${b}`}
          x={fX(u) - bw / 2} y={fY(u, d) - bh / 2}
          width={bw} height={bh}
          fill={C.crack} opacity={0.28}
        />
      ))}

      {/* Wet / mineral streaks */}
      {streaks.map(({ u, dLen }, w) => (
        <line key={`w${w}`}
          x1={fX(u)} y1={fY(u, 0)}
          x2={fX(u)} y2={fY(u, dLen)}
          stroke={C.wet} strokeWidth={1} opacity={0.45}
        />
      ))}

      {/* Moss near top edge */}
      {mossPts.map(({ u, d, w: mw }, m) => (
        <rect key={`m${m}`}
          x={fX(u) - mw / 2} y={fY(u, d)}
          width={mw} height={4}
          fill={C.moss} opacity={0.55}
        />
      ))}

      {/* Top-edge lit rim */}
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke={C.rim} strokeWidth={3} opacity={0.92} />

      {/* Deep shadow fade — bottom third */}
      <polygon points={pts(0, depth * 0.55, 1, depth)} fill={C.void} opacity={0.62} />
    </g>
  );
}

// dir='left'  → left-top edge of tile: (cx-hw,cy) → (cx,cy-hh)
// dir='right' → right-top edge of tile: (cx,cy-hh) → (cx+hw,cy)
function PicketFence({ cx, cy, zoom, dir = 'left' }: { cx: number; cy: number; zoom: number; dir?: 'left' | 'right' }) {
  const hw   = TILE_W * zoom / 2;
  const hh   = TILE_H * zoom / 2;
  const x1   = dir === 'left' ? cx - hw : cx;
  const y1   = dir === 'left' ? cy      : cy - hh;
  const x2   = dir === 'left' ? cx      : cx + hw;
  const y2   = dir === 'left' ? cy - hh : cy;
  const iron   = '#1C1828';
  const ironHi = '#342E48';
  const ironDk = '#0A0810';
  const rust   = '#4A2810';
  const pH     = 26 * zoom;  // bar height
  const pW     = 2.2 * zoom; // bar width
  const tipH   = 8 * zoom;   // gothic spike height
  const NUM    = 6;

  const pts = Array.from({ length: NUM }, (_, i) => {
    const t = i / (NUM - 1);
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
  });

  return (
    <g shapeRendering="crispEdges">
      {/* Rail drop shadows */}
      <line x1={x1+zoom} y1={y1 - pH*0.18 + zoom*2.5} x2={x2+zoom} y2={y2 - pH*0.18 + zoom*2.5}
        stroke={ironDk} strokeWidth={zoom*4.5} opacity={0.55} />
      <line x1={x1+zoom} y1={y1 - pH*0.70 + zoom*2}   x2={x2+zoom} y2={y2 - pH*0.70 + zoom*2}
        stroke={ironDk} strokeWidth={zoom*4.5} opacity={0.55} />
      {/* Lower rail */}
      <line x1={x1} y1={y1 - pH*0.18} x2={x2} y2={y2 - pH*0.18}
        stroke={iron} strokeWidth={zoom*4} />
      <line x1={x1} y1={y1 - pH*0.18 - zoom*0.6} x2={x2} y2={y2 - pH*0.18 - zoom*0.6}
        stroke={ironHi} strokeWidth={zoom*1} opacity={0.4} />
      {/* Upper rail */}
      <line x1={x1} y1={y1 - pH*0.70} x2={x2} y2={y2 - pH*0.70}
        stroke={iron} strokeWidth={zoom*4} />
      <line x1={x1} y1={y1 - pH*0.70 - zoom*0.6} x2={x2} y2={y2 - pH*0.70 - zoom*0.6}
        stroke={ironHi} strokeWidth={zoom*1} opacity={0.4} />
      {/* Vertical bars with gothic spear tips */}
      {pts.map(({ x: px, y: py }, i) => (
        <g key={i}>
          {/* Drop shadow */}
          <rect x={px-pW/2+zoom} y={py-pH-tipH+zoom*2} width={pW} height={pH+tipH}
            fill={ironDk} opacity={0.5} />
          {/* Bar body */}
          <rect x={px-pW/2} y={py-pH+tipH*0.25} width={pW} height={pH-tipH*0.25} fill={iron} />
          {/* Left highlight strip */}
          <rect x={px-pW/2} y={py-pH+tipH*0.25} width={zoom*0.7} height={pH-tipH*0.25}
            fill={ironHi} opacity={0.42} />
          {/* Gothic spear — elongated diamond tip */}
          <polygon
            points={`${px},${py-pH-tipH} ${px+pW*0.9},${py-pH-tipH*0.08} ${px},${py-pH+tipH*0.38} ${px-pW*0.9},${py-pH-tipH*0.08}`}
            fill={iron}
          />
          {/* Tip highlight */}
          <polygon
            points={`${px-pW*0.05},${py-pH-tipH+zoom} ${px-pW*0.55},${py-pH-tipH*0.18} ${px-pW*0.55},${py-pH-tipH*0.55}`}
            fill={ironHi} opacity={0.48}
          />
          {/* Rust streak on bar */}
          <rect x={px-pW*0.5} y={py-pH+tipH*0.3+zoom*3} width={pW} height={zoom*2}
            fill={rust} opacity={0.28} />
          {/* Decorative orb at upper rail crossing */}
          <rect x={px-pW} y={py-pH*0.71-pW*0.9} width={pW*2} height={pW*1.8}
            fill={ironHi} opacity={0.55} />
          {/* Decorative orb at lower rail crossing */}
          <rect x={px-pW*0.7} y={py-pH*0.19-pW*0.7} width={pW*1.4} height={pW*1.4}
            fill={ironHi} opacity={0.45} />
        </g>
      ))}
    </g>
  );
}

// ── Pixel mist — wispy horizontal strands in multiple animated layers ────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PixelMist({
  left, top, width, height, seedBase, dense, opMul = 1, cls,
}: {
  left: number; top: number; width: number; height: number;
  seedBase: number; dense?: boolean; opMul?: number; cls?: string;
}) {
  const SPACING = dense ? 7 : 11;
  const numRows = Math.ceil(height / SPACING);
  const rects: React.ReactNode[] = [];

  for (let wr = 0; wr < numRows; wr++) {
    const wy = top + wr * SPACING;
    const rowSeed = (((seedBase * 1193 + wr * 7321) | 0) >>> 0);
    const vy = wr / Math.max(numRows - 1, 1);
    // Dense at top, fades out at very bottom
    const vertOp = Math.pow(1 - vy * 0.6, 1.4);
    const numSegs = 3 + (rowSeed % 5);

    for (let s = 0; s < numSegs; s++) {
      const seg = (((rowSeed * 997 + s * 4271) | 0) >>> 0);
      const xFrac = (seg % 1000) / 1000;
      const wFrac = 0.04 + ((seg * 3 >>> 4) % 1000) / 1000 * 0.28;
      const wx = left + xFrac * width;
      const ww = Math.min(wFrac * width, left + width - wx);
      if (ww < 6) continue;
      const opFrac = ((seg * 17) % 100) / 100;
      const op = (0.10 + opFrac * 0.18) * vertOp * opMul;
      const rh = 3 + (seg % 8);
      const col = seg % 3 === 0 ? '#d4e8f8' : seg % 3 === 1 ? '#c0d4ec' : '#b8cce8';
      rects.push(
        <rect key={`${wr}-${s}`} x={wx} y={wy - rh / 2} width={ww} height={rh}
          fill={col} opacity={op} />
      );
    }
    // Full-width haze band every row for base density
    rects.push(
      <rect key={`bg${wr}`} x={left} y={wy - 1} width={width} height={3}
        fill="#a8c0e4" opacity={0.035 * vertOp * opMul} />
    );
  }
  return <g className={cls} style={{ pointerEvents: 'none' }}>{rects}</g>;
}

function Ghost({ cls, px = 22 }: { cls: string; px?: number }) {
  const h = Math.round((px * 30) / 22);
  return (
    <div className={`pointer-events-none absolute ${cls}`} style={{ zIndex: 30 }}>
      <svg width={px} height={h} viewBox="0 0 22 30"
        style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 0 5px rgba(180,180,255,0.55))' }}
        shapeRendering="crispEdges">
        {/* Head */}
        <rect x="5"  y="0"  width="12" height="2"  fill="#DDDEFF" opacity="0.92"/>
        <rect x="3"  y="2"  width="16" height="2"  fill="#DDDEFF" opacity="0.92"/>
        {/* Body */}
        <rect x="1"  y="4"  width="20" height="12" fill="#DDDEFF" opacity="0.90"/>
        <rect x="3"  y="2"  width="16" height="14" fill="#DDDEFF" opacity="0.90"/>
        {/* Wavy bottom */}
        <rect x="1"  y="16" width="4"  height="5"  fill="#DDDEFF" opacity="0.90"/>
        <rect x="7"  y="16" width="4"  height="7"  fill="#DDDEFF" opacity="0.90"/>
        <rect x="13" y="16" width="4"  height="5"  fill="#DDDEFF" opacity="0.90"/>
        <rect x="19" y="16" width="2"  height="3"  fill="#DDDEFF" opacity="0.90"/>
        {/* Inner body tint */}
        <rect x="3"  y="4"  width="16" height="12" fill="#B8BCFF" opacity="0.15"/>
        {/* Eyes */}
        <rect x="5"  y="7"  width="4"  height="5"  fill="#1C1848"/>
        <rect x="13" y="7"  width="4"  height="5"  fill="#1C1848"/>
        {/* Eye shine */}
        <rect x="5"  y="7"  width="2"  height="2"  fill="#6060A8"/>
        <rect x="13" y="7"  width="2"  height="2"  fill="#6060A8"/>
        {/* Mouth */}
        <rect x="8"  y="14" width="2"  height="2"  fill="#1C1848" opacity="0.7"/>
        <rect x="12" y="14" width="2"  height="2"  fill="#1C1848" opacity="0.7"/>
      </svg>
    </div>
  );
}

// ── Grass tufts on empty tiles ─────────────────────────────────────────────────
const TUFT_DEF = [
  { dx: -22, dy: -3, h: 10, lean:  2, g: 0 },
  { dx: -14, dy: -1, h: 14, lean: -3, g: 1 },
  { dx:  -7, dy: -3, h:  8, lean:  1, g: 0 },
  { dx:  -1, dy: -4, h: 12, lean:  2, g: 2 },
  { dx:   5, dy: -2, h: 10, lean: -2, g: 0 },
  { dx:  12, dy: -3, h: 13, lean:  1, g: 1 },
  { dx:  19, dy: -2, h:  9, lean: -2, g: 0 },
  { dx:  -9, dy: -6, h:  6, lean:  3, g: 2 },
  { dx:  16, dy: -5, h:  8, lean: -1, g: 2 },
  { dx:  25, dy: -3, h: 11, lean:  2, g: 1 },
];
const GRASS_SHADES = ['#2D6418', '#3A7820', '#235510'];

function GrassTufts({ cx, cy, zoom, seed }: { cx: number; cy: number; zoom: number; seed: number }) {
  const shown = TUFT_DEF.filter((_, i) => ((seed * 3 + i * 7) % 5) !== 2);

  // Wildflower (~1 in 5 tiles)
  const fseed = (seed * 127 + 53) % 23;
  const fcol  = fseed < 3 ? '#FFE040' : fseed < 6 ? '#FF9840' : fseed < 9 ? '#F0F0F0' : fseed < 11 ? '#FF7090' : null;
  const fdx   = ((seed * 31 + 5) % 30) - 15;

  // Fallen leaf (~1 in 4 tiles, several colours)
  const lseed = (seed * 89 + 17) % 19;
  const lcol  = lseed < 2 ? '#9B4A10' : lseed < 4 ? '#C06820' : lseed < 6 ? '#8B6820' : lseed < 8 ? '#A05018' : null;
  const ldx   = ((seed * 43 + 11) % 28) - 14;
  const ldy   = ((seed * 19 + 7)  % 10) - 5;

  // Pebble (~1 in 7 tiles)
  const pdx   = ((seed * 17 + 9) % 24) - 12;
  const pshow = (seed * 11) % 7 === 0;

  // Tiny mushroom (~1 in 16 tiles)
  const mshow = (seed * 233 + 7) % 16 === 0;
  const mdx   = ((seed * 61 + 3) % 20) - 10;

  return (
    <g>
      {shown.map((t, i) => (
        <line key={i}
          x1={cx + t.dx * zoom} y1={cy + t.dy * zoom}
          x2={cx + (t.dx + t.lean) * zoom} y2={cy + (t.dy - t.h) * zoom}
          stroke={GRASS_SHADES[t.g]} strokeWidth={Math.max(0.8, 1.2 * zoom)} strokeLinecap="round"
        />
      ))}

      {/* Wildflower */}
      {fcol && (
        <g opacity={0.85}>
          <rect x={cx+fdx*zoom-zoom}    y={cy-7*zoom-zoom} width={zoom*2}   height={zoom*2}   fill={fcol} />
          <rect x={cx+fdx*zoom-zoom*2}  y={cy-7*zoom}      width={zoom*1.2} height={zoom}     fill={fcol} opacity={0.55} />
          <rect x={cx+fdx*zoom+zoom}    y={cy-7*zoom}      width={zoom*1.2} height={zoom}     fill={fcol} opacity={0.55} />
          <rect x={cx+fdx*zoom-zoom*0.5} y={cy-5*zoom}     width={zoom}     height={zoom*2.5} fill="#5A3A10" opacity={0.65} />
        </g>
      )}

      {/* Fallen leaf (small rotated-ish rect) */}
      {lcol && (
        <g opacity={0.75}>
          <rect x={cx+ldx*zoom-zoom*1.5} y={cy+ldy*zoom-zoom*0.5} width={zoom*3} height={zoom}   fill={lcol} />
          <rect x={cx+ldx*zoom-zoom*0.5} y={cy+ldy*zoom-zoom}      width={zoom}   height={zoom*2} fill={lcol} opacity={0.6} />
        </g>
      )}

      {/* Pebble */}
      {pshow && (
        <g opacity={0.5}>
          <rect x={cx+pdx*zoom}          y={cy-zoom*2}   width={zoom*3} height={zoom*1.5} fill="#606050" />
          <rect x={cx+pdx*zoom+zoom*0.5} y={cy-zoom*2.5} width={zoom*2} height={zoom*0.8} fill="#808070" opacity={0.6} />
        </g>
      )}

      {/* Mushroom */}
      {mshow && (
        <g shapeRendering="crispEdges">
          {/* Stem */}
          <rect x={cx+mdx*zoom-zoom*0.8} y={cy-zoom*5} width={zoom*1.6} height={zoom*3.5} fill="#D4C4A8" />
          {/* Cap */}
          <rect x={cx+mdx*zoom-zoom*2.5} y={cy-zoom*8} width={zoom*5}   height={zoom*3}   fill="#8B3A1A" />
          <rect x={cx+mdx*zoom-zoom*1.8} y={cy-zoom*9} width={zoom*3.6} height={zoom}     fill="#8B3A1A" />
          {/* Cap highlight */}
          <rect x={cx+mdx*zoom-zoom*1.5} y={cy-zoom*8} width={zoom*1.2} height={zoom*1.5} fill="#B04E24" opacity={0.6} />
          {/* White dots */}
          <rect x={cx+mdx*zoom-zoom*1}   y={cy-zoom*7.5} width={zoom*0.8} height={zoom*0.8} fill="#FFFFFF" opacity={0.7} />
          <rect x={cx+mdx*zoom+zoom*0.5} y={cy-zoom*8}   width={zoom*0.8} height={zoom*0.8} fill="#FFFFFF" opacity={0.6} />
        </g>
      )}
    </g>
  );
}

// ── Isometric grave sprite ────────────────────────────────────────────────────
interface GraveProps {
  cx: number; cy: number;
  grave: Grave;
  zoom: number;
  hovered: boolean;
  isNew: boolean;
  onClickGrave: () => void;
  onHoverGrave: (g: Grave | null) => void;
}

function IsoGrave({ cx, cy, grave, zoom, hovered, isNew, onClickGrave, onHoverGrave }: GraveProps) {
  const tier = grave.tier;

  // baseY = tile centre = ground level in isometric view
  const baseY = cy;

  // Stone dimensions
  const sw  = (tier === 4 ? TILE_W * 0.66 : tier === 3 ? TILE_W * 0.37 : TILE_W * 0.33) * zoom;
  const sh  = sw * (tier === 4 ? 1.50 : tier === 3 ? 2.18 : 1.65);
  const dep = sw * 0.13;  // thin slab right-side depth
  const sx  = cx - sw / 2;
  const sy  = baseY - sh;

  // Colour palette
  const front   = hovered ? '#9A98B8' : '#72708C';
  const frontHi = '#8C8AA8';
  const frontLo = '#565468';
  const sideCol = '#2C2A3C';
  const topCol  = '#9896B0';
  const shadow  = '#1E1C2A';
  const gold    = '#C8A96E';
  const green   = '#4A7038';
  const moss    = '#2A3A18';

  // Icon
  const iconUrl = grave.icon ? twemojiUrl(grave.icon) : null;
  const iconSz  = sw * 0.46;
  const iconY   = sy + sh * (tier === 3 ? 0.42 : 0.22);

  // Text
  const nameStr = grave.subject.length > 13 ? grave.subject.slice(0, 12) + '…' : grave.subject;
  const yearStr = String(new Date(grave.created_at).getFullYear());
  const nameSz  = Math.max(7, 9 * zoom);
  const yearSz  = Math.max(5, 7 * zoom);

  // Shared thin right-side slab face
  const sideFace = <rect x={sx+sw} y={sy} width={dep} height={sh} fill={sideCol} />;

  let stone: React.ReactNode;

  if (tier === 4) {
    // ── Mausoleum / temple building ───────────────────────────────────────
    const roofH = sh * 0.20, bodyH = sh * 0.50;
    const doorW = sw * 0.26, doorH = bodyH * 0.55;
    const colW  = sw * 0.09, stepH = sh * 0.075;
    stone = (
      <g>
        <polygon points={`${sx+sw},${sy+roofH} ${sx+sw+dep},${sy+roofH} ${cx+dep*0.5},${sy}`} fill="#241A50" />
        <rect x={sx+sw} y={sy+roofH} width={dep} height={bodyH} fill={sideCol} />
        <rect x={sx+sw} y={sy+roofH+bodyH} width={dep+2*zoom} height={stepH*3} fill={sideCol} opacity={0.7} />
        <polygon points={`${sx},${sy+roofH} ${sx+sw},${sy+roofH} ${cx},${sy}`} fill="#2E2464" />
        <line x1={cx} y1={sy} x2={cx} y2={sy+roofH} stroke="#5A52A0" strokeWidth={zoom*1.5} opacity={0.5} />
        <rect x={sx} y={sy+roofH} width={sw} height={3*zoom} fill={topCol} opacity={0.5} />
        <rect x={sx} y={sy+roofH+3*zoom} width={sw} height={bodyH-3*zoom} fill={front} />
        {[-0.30, 0.30].map((xOff, i) => (
          <g key={i}>
            <rect x={cx+xOff*sw-colW/2} y={sy+roofH+3*zoom} width={colW} height={bodyH-3*zoom} fill={frontHi} opacity={0.55} />
            <rect x={cx+xOff*sw+colW/2} y={sy+roofH+3*zoom} width={colW*0.35} height={bodyH-3*zoom} fill={sideCol} opacity={0.35} />
          </g>
        ))}
        <text x={cx} y={sy+roofH+bodyH*0.28} textAnchor="middle"
          fill="#7870C0" fontSize={Math.max(4, 5*zoom)} fontFamily="var(--font-pixel)">MAUSOLEUM</text>
        <rect x={cx-doorW/2} y={sy+roofH+bodyH-doorH-doorW*0.32} width={doorW} height={doorW*0.32} fill={shadow} />
        <rect x={cx-doorW*0.36} y={sy+roofH+bodyH-doorH-doorW*0.46} width={doorW*0.72} height={doorW*0.18} fill={shadow} />
        <rect x={cx-doorW/2} y={sy+roofH+bodyH-doorH} width={doorW} height={doorH} fill={shadow} />
        <rect x={sx-2*zoom}  y={sy+roofH+bodyH}         width={sw+4*zoom}  height={stepH} fill={frontHi} opacity={0.60} />
        <rect x={sx-5*zoom}  y={sy+roofH+bodyH+stepH}   width={sw+10*zoom} height={stepH} fill={frontHi} opacity={0.45} />
        <rect x={sx-8*zoom}  y={sy+roofH+bodyH+stepH*2} width={sw+16*zoom} height={stepH} fill={frontHi} opacity={0.32} />
      </g>
    );
  } else if (tier === 3) {
    // ── Celtic Cross — shaft + arm + ring boss ────────────────────────────
    const vw    = sw * 0.36;
    const armH2 = sh * 0.22;
    const armY  = sy + sh * 0.18;
    const ringR = sw * 0.28;
    const ringCY = armY + armH2 / 2;
    stone = (
      <g>
        {/* Shaft right side */}
        <rect x={cx+vw/2} y={sy} width={dep*0.7} height={sh} fill={sideCol} />
        {/* Arm right side */}
        <rect x={sx+sw} y={armY} width={dep*0.5} height={armH2} fill={sideCol} opacity={0.8} />
        {/* Vertical shaft */}
        <rect x={cx-vw/2} y={sy} width={vw} height={sh} fill={front} />
        {/* Horizontal arm */}
        <rect x={sx} y={armY} width={sw} height={armH2} fill={front} />
        {/* Ring boss (pixel circle approximation) */}
        <rect x={cx-ringR}     y={ringCY-ringR}     width={ringR*2}   height={ringR*2}   fill={front} />
        <rect x={cx-ringR*0.7} y={ringCY-ringR*1.3} width={ringR*1.4} height={ringR*2.6} fill={front} />
        <rect x={cx-ringR*1.3} y={ringCY-ringR*0.7} width={ringR*2.6} height={ringR*1.4} fill={front} />
        {/* Ring inner cutout */}
        <rect x={cx-ringR*0.55} y={ringCY-ringR*0.55} width={ringR*1.1} height={ringR*1.1} fill={frontLo} opacity={0.6} />
        {/* Shaft highlight */}
        <rect x={cx-vw/2} y={sy} width={zoom*1.5} height={sh} fill={frontHi} opacity={0.55} />
        {/* Ring top highlight */}
        <rect x={cx-ringR} y={ringCY-ringR} width={ringR*2} height={zoom*2} fill={frontHi} opacity={0.5} />
        {/* Knotwork dots on lower shaft */}
        {[0.55, 0.68, 0.81].map((t, i) => (
          <rect key={i} x={cx-vw/2+3*zoom} y={sy+sh*t} width={zoom*1.5} height={zoom*1.5} fill={shadow} opacity={0.5} />
        ))}
        {/* Arm engrave border */}
        <rect x={sx+3*zoom} y={armY+2*zoom} width={sw-6*zoom} height={armH2-4*zoom}
          fill="none" stroke={shadow} strokeWidth={zoom} opacity={0.45} />
        {/* Moss at base */}
        <rect x={cx-vw/2+zoom} y={sy+sh*0.82} width={vw-2*zoom} height={sh*0.18-zoom} fill={moss} opacity={0.45} />
      </g>
    );
  } else if (tier === 2) {
    // ── Shouldered Arch — three-step profile, clean and refined ──────────
    const capW  = sw * 0.55;
    const step1 = sh * 0.11;
    const midW  = sw * 0.77;
    const step2 = sh * 0.09;
    const bodyY = sy + step1 + step2;
    const bodyH = sh - step1 - step2;
    stone = (
      <g>
        {/* Side faces per level */}
        <rect x={cx+capW/2} y={sy} width={dep*0.5} height={step1} fill={sideCol} opacity={0.6} />
        <rect x={cx+midW/2} y={sy+step1} width={dep*0.75} height={step2} fill={sideCol} opacity={0.75} />
        <rect x={sx+sw} y={bodyY} width={dep} height={bodyH} fill={sideCol} />
        {/* Stone faces — back to front */}
        <rect x={sx} y={bodyY} width={sw} height={bodyH} fill={front} />
        <rect x={cx-midW/2} y={sy+step1} width={midW} height={step2} fill={front} />
        <rect x={cx-capW/2} y={sy} width={capW} height={step1} fill={front} />
        {/* Top edge highlights */}
        <rect x={cx-capW/2} y={sy} width={capW} height={zoom*1.5} fill={topCol} opacity={0.55} />
        <rect x={cx-midW/2} y={sy+step1} width={midW} height={zoom*1.5} fill={topCol} opacity={0.35} />
        <rect x={sx} y={bodyY} width={sw} height={zoom*1.5} fill={topCol} opacity={0.22} />
        {/* Left highlights */}
        <rect x={cx-capW/2} y={sy} width={zoom*1.5} height={step1} fill={frontHi} opacity={0.65} />
        <rect x={cx-midW/2} y={sy+step1} width={zoom*1.5} height={step2} fill={frontHi} opacity={0.60} />
        <rect x={sx} y={bodyY} width={zoom*1.5} height={bodyH} fill={frontHi} opacity={0.60} />
        {/* Moss at base */}
        <rect x={sx+zoom} y={sy+sh*0.82} width={sw-2*zoom} height={sh*0.18-zoom} fill={moss} opacity={0.30} />
        <rect x={sx+sw} y={sy+sh*0.82} width={dep} height={sh*0.18-zoom} fill={moss} opacity={0.18} />
        {/* Inscription border */}
        <rect x={sx+3*zoom} y={bodyY+3*zoom} width={sw-6*zoom} height={bodyH-6*zoom}
          fill="none" stroke={shadow} strokeWidth={zoom} opacity={0.5} />
      </g>
    );
  } else {
    // ── T1: Crumbled Round Arch — weathered, cracked, mossy ──────────────
    const archH = sh * 0.36;
    const ARCH: [number, number][] = [
      [0.00, 0.32], [0.15, 0.54], [0.32, 0.74],
      [0.52, 0.90], [0.74, 1.00],
    ];
    stone = (
      <g>
        {sideFace}
        <rect x={sx} y={sy+archH} width={sw} height={sh-archH} fill={front} />
        {ARCH.map(([frac, w], i) => {
          const nf = i < ARCH.length-1 ? ARCH[i+1][0] : 1.0;
          return <rect key={i} x={cx-sw*w/2} y={sy+archH*frac} width={sw*w} height={archH*(nf-frac)+zoom} fill={front} />;
        })}
        {/* Left edge highlight */}
        <rect x={sx} y={sy+archH*0.74} width={zoom*1.5} height={sh-archH*0.74} fill={frontHi} opacity={0.55} />
        {/* Heavy moss / weathering at base */}
        <rect x={sx+zoom} y={sy+sh*0.70} width={sw-2*zoom} height={sh*0.30-zoom} fill={moss} opacity={0.62} />
        <rect x={sx+sw} y={sy+sh*0.70} width={dep} height={sh*0.30-zoom} fill={moss} opacity={0.38} />
        {/* Cracks */}
        <rect x={cx-3*zoom} y={sy+archH+2*zoom} width={zoom} height={sh*0.26} fill={shadow} opacity={0.78} />
        <rect x={cx-2*zoom} y={sy+archH+sh*0.24} width={4*zoom} height={zoom} fill={shadow} opacity={0.55} />
        <rect x={sx+sw*0.68} y={sy+archH+sh*0.08} width={zoom} height={sh*0.18} fill={shadow} opacity={0.55} />
        {/* Chipped arch edge — asymmetric damage */}
        <rect x={sx} y={sy+archH*0.42} width={sw*0.10} height={archH*0.20} fill={frontLo} opacity={0.9} />
        {/* Worn engrave border */}
        <rect x={sx+4*zoom} y={sy+archH+4*zoom} width={sw-8*zoom} height={sh-archH-8*zoom}
          fill="none" stroke={frontLo} strokeWidth={zoom} opacity={0.38} />
      </g>
    );
  }

  return (
    <g
      onClick={onClickGrave}
      onMouseEnter={() => onHoverGrave(grave)}
      onMouseLeave={() => onHoverGrave(null)}
      style={{ cursor: 'pointer' }}
      className={isNew ? 'animate-pulse' : ''}
    >
      {/* Transparent hit area */}
      <rect x={sx-dep} y={sy-dep*2} width={sw+dep*3} height={sh+dep*2+30*zoom} fill="transparent" />

      {/* Dirt mound under stone base */}
      <ellipse cx={cx+dep*0.35} cy={baseY+zoom*1.5} rx={sw*0.56} ry={sw*0.13} fill="#2E1A0A" opacity={0.9} />
      <ellipse cx={cx+dep*0.25} cy={baseY}           rx={sw*0.46} ry={sw*0.10} fill="#3E2410" />
      <ellipse cx={cx+dep*0.15} cy={baseY-zoom}      rx={sw*0.32} ry={sw*0.065} fill="#4A2C14" opacity={0.8} />
      {/* Dirt clumps */}
      <rect x={cx-sw*0.33} y={baseY-zoom*1.5} width={sw*0.10} height={zoom*2} fill="#301808" opacity={0.55} />
      <rect x={cx-sw*0.08} y={baseY-zoom}     width={sw*0.08} height={zoom*1.5} fill="#301808" opacity={0.45} />
      <rect x={cx+sw*0.20} y={baseY-zoom*1.5} width={sw*0.09} height={zoom*2} fill="#301808" opacity={0.55} />

      {stone}

      {/* Hover gold glow */}
      {hovered && (
        <rect x={sx-2*zoom} y={sy-2*zoom} width={sw+4*zoom} height={sh+4*zoom}
          fill="none" stroke={gold} strokeWidth={1.5*zoom} opacity={0.75} />
      )}

      {/* Emoji icon centred on stone face */}
      {iconUrl && tier !== 4 && (
        <image href={iconUrl} x={cx-iconSz/2} y={iconY} width={iconSz} height={iconSz} />
      )}
      {/* RIP fallback */}
      {!iconUrl && tier !== 4 && (
        <text x={cx} y={iconY + iconSz*0.7} textAnchor="middle"
          fill={gold} fontSize={Math.max(7, 10*zoom)} fontFamily="var(--font-vt323)">RIP</text>
      )}

      {/* Name below stone, offset for 2.5D */}
      <text x={cx+dep*0.4} y={baseY+13*zoom} textAnchor="middle"
        fill="#D0CCBE" fontSize={nameSz} fontFamily="var(--font-vt323)">
        {nameStr}
      </text>
      {/* Year */}
      <text x={cx+dep*0.4} y={baseY+13*zoom+nameSz+1} textAnchor="middle"
        fill={green} fontSize={yearSz} fontFamily="monospace">
        {yearStr}
      </text>
    </g>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
interface Props { initialGraves: Grave[] }

export default function GraveyardCanvas({ initialGraves }: Props) {
  const [graves,   setGraves]  = useState<Grave[]>(initialGraves);
  const [selected, setSelected] = useState<Grave | null>(null);
  const [cam,      setCam]     = useState({ x: -200, y: -95 });
  const [zoom,     setZoom]    = useState(0.85);
  const [dragging, setDragging] = useState(false);
  const [hovered,  setHovered] = useState<Grave | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [newIds,   setNewIds]  = useState<Set<string>>(new Set());
  const [showHint, setShowHint] = useState(true);
  const [vpSize,   setVpSize]  = useState({ w: 1200, h: 700 });

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef      = useRef({ lastX: 0, lastY: 0, moved: false });
  const touchRef     = useRef({ lastX: 0, lastY: 0 });

  const VW = vpSize.w;
  const VH = vpSize.h;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setVpSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    setVpSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const originX = Math.round(VW / 2);
  const originY = Math.round(VH * 0.29);

  // Non-passive scroll zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.max(0.3, Math.min(2.5, z * (e.deltaY < 0 ? 1.1 : 0.9))));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Map graves to display grid — totalRows is always the fixed DISP_ROWS constant
  const graveMap = useMemo(() => {
    const map = new Map<string, Grave>();
    for (const g of graves) {
      if (g.grid_x == null || g.grid_y == null) continue;
      const { col, row } = dbToDisp(g.grid_x);
      map.set(`${col},${row}`, g);
    }
    return map;
  }, [graves]);

  const totalRows = DISP_ROWS;

  const worldBounds = useMemo(() => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    const bump = (col: number, row: number) => {
      const { x, y } = isoOff(col, row);
      const hw = TILE_W / 2;
      const hh = TILE_H / 2;
      minX = Math.min(minX, x - hw);
      maxX = Math.max(maxX, x + hw);
      minY = Math.min(minY, y - hh);
      maxY = Math.max(maxY, y + hh + WALL_H);
    };
    const col0 = -BG_EXT;
    const row0 = -BG_EXT;
    const nc = DISP_COLS + 2 * BG_EXT;
    const nr = totalRows + 2 * BG_EXT;
    for (let d = 0; d <= (nc - 1) + (nr - 1); d++) {
      for (let ci = Math.max(0, d - (nr - 1)); ci <= Math.min(nc - 1, d); ci++) {
        bump(col0 + ci, row0 + d - ci);
      }
    }
    const horizonY = minY - TILE_H * 1.55;
    return { minX, maxX, minY, maxY, horizonY };
  }, [totalRows]);

  // Pan extents include the buffer ring + cliff depth
  const panExtents = useMemo(() => {
    const left  = isoOff(-BG_EXT,              0).x          - TILE_W / 2;
    const right = isoOff(DISP_COLS + BG_EXT,   totalRows).x  + TILE_W / 2;
    const top   = isoOff(0,                    -BG_EXT).y    - TILE_H / 2 - 160;
    const bot   = isoOff(0,  totalRows + BG_EXT).y           + TILE_H / 2 + 400;
    return { minX: left - 80, maxX: right + 80, minY: top, maxY: bot };
  }, [totalRows]);

  /** Cemetery cells only (graves / fence). Buffer = BG_EXT ring with grass + props. */
  const tiles = useMemo(() => {
    const col0 = -BG_EXT;
    const row0 = -BG_EXT;
    const nc = DISP_COLS + 2 * BG_EXT;
    const nr = totalRows + 2 * BG_EXT;
    const result: Array<{ col: number; row: number }> = [];
    for (let d = 0; d <= (nc - 1) + (nr - 1); d++) {
      for (let ci = Math.max(0, d - (nr - 1)); ci <= Math.min(nc - 1, d); ci++) {
        result.push({ col: col0 + ci, row: row0 + d - ci });
      }
    }
    return result;
  }, [totalRows]);

  // Dead trees along the left/right boundary, rendered after all tiles
  const boundaryTrees = useMemo(() => {
    const result: Array<{ col: number; row: number; flip: boolean }> = [];
    for (let r = 0; r < totalRows; r += 2) {
      result.push({ col: -1,            row: r,     flip: false });
      result.push({ col: -1.5,          row: r + 1, flip: true  });
      result.push({ col: DISP_COLS,     row: r,     flip: true  });
      result.push({ col: DISP_COLS + 0.5, row: r + 1, flip: false });
    }
    return result;
  }, [totalRows]);

  useEffect(() => {
    setCam(c =>
      clampCamera(
        c,
        zoom,
        originX,
        originY,
        VW,
        VH,
        panExtents.minX,
        panExtents.maxX,
        panExtents.minY,
        panExtents.maxY,
        CAM_MARGIN,
      ),
    );
  }, [zoom, VW, VH, panExtents, originX, originY]);

  // Mouse handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    setShowHint(false);
    dragRef.current = { lastX: e.clientX, lastY: e.clientY, moved: false };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    if (!dragging) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    if (Math.abs(dx) + Math.abs(dy) > 4) dragRef.current.moved = true;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    setCam(c =>
      clampCamera(
        { x: c.x + dx, y: c.y + dy },
        zoom,
        originX,
        originY,
        VW,
        VH,
        panExtents.minX,
        panExtents.maxX,
        panExtents.minY,
        panExtents.maxY,
        CAM_MARGIN,
      ),
    );
  }, [dragging, zoom, originX, originY, VW, VH, panExtents]);

  const onMouseUp = useCallback(() => setDragging(false), []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setShowHint(false);
    const t = e.touches[0];
    touchRef.current = { lastX: t.clientX, lastY: t.clientY };
  }, []);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - touchRef.current.lastX;
    const dy = t.clientY - touchRef.current.lastY;
    touchRef.current = { lastX: t.clientX, lastY: t.clientY };
    setCam(c =>
      clampCamera(
        { x: c.x + dx, y: c.y + dy },
        zoom,
        originX,
        originY,
        VW,
        VH,
        panExtents.minX,
        panExtents.maxX,
        panExtents.minY,
        panExtents.maxY,
        CAM_MARGIN,
      ),
    );
  }, [zoom, originX, originY, VW, VH, panExtents]);

  // Realtime subscription — all tiers
  useEffect(() => {
    const ch = supabaseClient
      .channel('canvas:graves')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'graves' }, payload => {
        const g = payload.new as Grave;
        if (g.status === 'approved') {
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

  const zoomIn  = useCallback(() => setZoom(z => Math.min(2.5, z * 1.25)), []);
  const zoomOut = useCallback(() => setZoom(z => Math.max(0.3, z / 1.25)), []);

  return (
    <>
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        style={{
          flex: 1,
          minHeight: 560,
          cursor: dragging ? 'grabbing' : 'grab',
          background:
            'radial-gradient(ellipse 90% 55% at 50% 0%, rgba(48,44,72,0.12) 0%, transparent 45%), #06060a',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => {}}
      >
        {/* ── Screen-space starfield — fills entire black background, doesn't pan ── */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} shapeRendering="crispEdges">
          <defs>
            <radialGradient id="nebula1" cx="30%" cy="20%" r="35%">
              <stop offset="0%"   stopColor="#1a0a2e" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#1a0a2e" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="nebula2" cx="75%" cy="65%" r="28%">
              <stop offset="0%"   stopColor="#0a1a2e" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0a1a2e" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="nebula3" cx="55%" cy="85%" r="22%">
              <stop offset="0%"   stopColor="#0e1a10" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0e1a10" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Nebula washes */}
          <rect x="0" y="0" width="100%" height="100%" fill="url(#nebula1)" />
          <rect x="0" y="0" width="100%" height="100%" fill="url(#nebula2)" />
          <rect x="0" y="0" width="100%" height="100%" fill="url(#nebula3)" />
          {/* Dense stars — deterministic from index */}
          {Array.from({ length: 280 }, (_, i) => {
            const xf = ((i * 2473 + 97)  % 9973) / 9973;
            const yf = ((i * 1637 + 211) % 7919) / 7919;
            const brightness = ((i * 31) % 7);
            const size = i % 18 === 0 ? 2 : 1;
            const opacity = (brightness + 3) / 11;
            const twinkle = i % 5 === 0;
            return (
              <rect key={i}
                x={xf * VW} y={yf * VH}
                width={size} height={size}
                fill={twinkle ? '#e8e4ff' : '#d8d4f8'}
                opacity={twinkle ? Math.min(opacity * 1.6, 0.82) : opacity}
              />
            );
          })}
          {/* Shooting star streaks */}
          {[
            { x1: VW*0.12, y1: VH*0.08, x2: VW*0.19, y2: VH*0.12, op: 0.18 },
            { x1: VW*0.68, y1: VH*0.05, x2: VW*0.74, y2: VH*0.09, op: 0.14 },
            { x1: VW*0.42, y1: VH*0.16, x2: VW*0.46, y2: VH*0.19, op: 0.12 },
          ].map((s, i) => (
            <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
              stroke="#ffffff" strokeWidth="0.8" opacity={s.op} strokeLinecap="round" />
          ))}
          {/* ── Dark pixel clouds drifting across sky ── */}
          {/* Cloud 1 — left of center */}
          <g className="cloud-1" style={{ opacity: 0.72 }}>
            {[
              [4,0,8],[1,2,18],[0,4,22],[0,6,22],[0,8,20],[2,10,16],[5,12,9],
            ].map(([dx, dy, w], i) => (
              <rect key={i} x={VW*0.14 + dx*4} y={VH*0.09 + dy*3} width={w*4} height={13} fill="#28223c" />
            ))}
          </g>
          {/* Cloud 2 — drifts in front of moon */}
          <g className="cloud-2" style={{ opacity: 0.60 }}>
            {[
              [3,0,7],[1,2,14],[0,4,16],[0,6,16],[0,8,14],[2,10,9],
            ].map(([dx, dy, w], i) => (
              <rect key={i} x={VW*0.62 + dx*4} y={VH*0.07 + dy*3} width={w*4} height={13} fill="#22203a" />
            ))}
          </g>

          {/* ── Screen-space pixel moon — top-right, always visible ── */}
          {(() => {
            const mx = VW * 0.80, my = VH * 0.09;
            const s = 3; // pixel size
            // Full circle mask + glow halo
            return (
              <g>
                {/* Soft glow ring */}
                <circle cx={mx + 9*s} cy={my + 9*s} r={14*s} fill="#e8dfc0" opacity={0.04} />
                <circle cx={mx + 9*s} cy={my + 9*s} r={11*s} fill="#e8dfc0" opacity={0.06} />
                {/* Moon body — pixel art circle */}
                {[
                  [3,0,12],[1,1,16],[0,2,18],[0,3,18],[0,4,18],[0,5,18],[0,6,18],
                  [0,7,18],[0,8,18],[0,9,18],[0,10,18],[0,11,18],[0,12,18],
                  [1,13,16],[3,14,12],[6,15,6],
                ].map(([dx, dy, w], i) => (
                  <rect key={i} x={mx + dx*s} y={my + dy*s} width={w*s} height={s} fill="#e8dfc0" opacity={0.90} />
                ))}
                {/* Craters */}
                <rect x={mx + 4*s} y={my + 4*s} width={3*s} height={2*s} fill="#c8c0a0" opacity={0.55} />
                <rect x={mx + 3*s} y={my + 5*s} width={5*s} height={s}   fill="#c8c0a0" opacity={0.45} />
                <rect x={mx + 9*s} y={my + 9*s} width={2*s} height={2*s} fill="#c8c0a0" opacity={0.50} />
                <rect x={mx + 8*s} y={my + 10*s} width={4*s} height={s}  fill="#c8c0a0" opacity={0.40} />
                <rect x={mx + 5*s} y={my + 12*s} width={2*s} height={s}  fill="#c8c0a0" opacity={0.45} />
                {/* Shadow crescent — right side slightly darker */}
                {[
                  [12,2,4],[14,3,3],[15,4,2],[15,5,2],[15,6,2],[15,7,2],[15,8,2],
                  [15,9,2],[14,10,3],[12,11,3],[10,12,4],
                ].map(([dx, dy, w], i) => (
                  <rect key={`sh${i}`} x={mx + dx*s} y={my + dy*s} width={w*s} height={s} fill="#0a0908" opacity={0.30} />
                ))}
              </g>
            );
          })()}
        </svg>

        {/* ── World: backdrop + grid share pan/zoom ── */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
          shapeRendering="crispEdges"
        >
          <g transform={`translate(${originX + cam.x}, ${originY + cam.y}) scale(${zoom})`}>
            <WorldBackdrop
              horizonY={worldBounds.horizonY}
              minX={worldBounds.minX}
              maxX={worldBounds.maxX}
              maxY={worldBounds.maxY}
            />
            {/* ── Iso cells: cemetery + BG_EXT buffer (grass / trees / props) ── */}
            {tiles.map(({ col, row }) => {
            const { x: cx, y: cy } = toWorld(col, row);
            const hw  = TILE_W / 2;
            const hh  = TILE_H / 2;
            const wh  = WALL_H;
            const inGrid = col >= 0 && col < DISP_COLS && row >= 0 && row < totalRows;
            const isBuffer = !inGrid;
            const grave = inGrid ? graveMap.get(`${col},${row}`) : undefined;
            const seed  = ((col * 13 + row * 7) % 17 + 17) % 17;

            // Organic tile colour — LCG-style hash (offset so negative col/row work)
            const th = (((col + 64) * 6271 + (row + 64) * 2333 + (col & 63) * (row & 63) * 47) >>> 0) % 8;
            const TOP_PAL = ['#253E14','#1E3810','#284015','#1C3410','#2A4218','#223C12','#264016','#1A3210'];
            const topFill  = TOP_PAL[th];
            const leftFill  = th % 2 === 0 ? '#162809' : '#132406';
            const rightFill = th % 3 === 0 ? '#111F06' : '#0F1C05';

            const topPts   = `${cx},${cy-hh} ${cx+hw},${cy} ${cx},${cy+hh} ${cx-hw},${cy}`;
            const leftPts  = `${cx-hw},${cy} ${cx},${cy+hh} ${cx},${cy+hh+wh} ${cx-hw},${cy+wh}`;
            const rightPts = `${cx+hw},${cy} ${cx},${cy+hh} ${cx},${cy+hh+wh} ${cx+hw},${cy+wh}`;

            return (
              <g key={`t${col}-${row}`}>
                {/* Tile (no pointer events) */}
                <g style={{ pointerEvents: 'none' }}>
                  <polygon points={leftPts}  fill={leftFill} />
                  <polygon points={rightPts} fill={rightFill} />
                  <polygon points={topPts}   fill={topFill} />
                  {/* Dirt patch overlay on some tiles (~1 in 6) */}
                  {th % 6 === 0 && (
                    <ellipse
                      cx={cx + ((seed%5)-2)*4} cy={cy + ((seed%3)-1)*3}
                      rx={hw*0.30} ry={hh*0.28}
                      fill="#130E04" opacity={0.30}
                    />
                  )}
                  {/* Moss cluster on some tile corners (~1 in 9) */}
                  {th % 9 === 3 && (
                    <ellipse
                      cx={cx - hw*0.6 + ((seed%3)*hw*0.3)} cy={cy + ((seed%3)-1)*hh*0.3}
                      rx={hw*0.18} ry={hh*0.15}
                      fill="#1A3A0A" opacity={0.45}
                    />
                  )}
                  {/* ── Cliff walls — outer edge of the 2-cell buffer ring ── */}
                  {/* Left cliff face: outermost left buffer column */}
                  {col === -BG_EXT && (
                    <CliffFace
                      ax={cx - hw} ay={cy}
                      bx={cx}      by={cy + hh}
                      depth={CLIFF_H} seed={seed}
                    />
                  )}
                  {/* Right cliff face: outermost right buffer column */}
                  {col === DISP_COLS + BG_EXT - 1 && (
                    <CliffFace
                      ax={cx}      ay={cy + hh}
                      bx={cx + hw} by={cy}
                      depth={CLIFF_H} seed={seed + 5}
                    />
                  )}
                  {/* Front cliff — both faces of outermost front buffer row */}
                  {row === totalRows + BG_EXT - 1 && (
                    <>
                      <CliffFace
                        ax={cx - hw} ay={cy}
                        bx={cx}      by={cy + hh}
                        depth={CLIFF_H} seed={seed + 3}
                      />
                      <CliffFace
                        ax={cx}      ay={cy + hh}
                        bx={cx + hw} by={cy}
                        depth={CLIFF_H} seed={seed + 7}
                      />
                    </>
                  )}
                  {/* Iron fence — back two cemetery edges only */}
                  {inGrid && col === 0 && <PicketFence cx={cx} cy={cy} zoom={1} dir="left" />}
                  {inGrid && row === 0 && <PicketFence cx={cx} cy={cy} zoom={1} dir="right" />}
                  {/* Grass on every cell */}
                  {!grave && <GrassTufts cx={cx} cy={cy} zoom={1} seed={seed} />}
                  {/* Buffer ring: forest trees + horror props */}
                  {isBuffer && (() => {
                    const k    = (seed + col * 3 + row * 5) % 20;
                    const flip = (col + row) % 2 === 0;
                    const v    = ((seed + col + row * 2) % 3) as 0 | 1 | 2;
                    // Outermost buffer row/col — keep trees shorter so cliff shows
                    const isOuter =
                      col === -BG_EXT || col === DISP_COLS + BG_EXT - 1 ||
                      row === -BG_EXT || row === totalRows + BG_EXT - 1;
                    const scBase = isOuter
                      ? 0.44 + (seed % 4) * 0.03
                      : 0.58 + (seed % 5) * 0.05;
                    const vyScale = isOuter ? 0.7 : 2.0;
                    if (k === 2) return <DeadTree cx={cx} cy={cy} sc={isOuter ? 0.24 : 0.34} flip={flip} />;
                    if (k === 3) return <DeadStump cx={cx} cy={cy} sc={isOuter ? 0.5 : 0.72} />;
                    if (k === 0 && !isOuter) return <HorrorCross cx={cx} cy={cy} sc={0.64} />;
                    if (k === 1 && !isOuter) return <CreepyObelisk cx={cx} cy={cy} sc={0.68} />;
                    return <ForestTree cx={cx} cy={cy} sc={scBase} flip={flip} variant={v} vyScale={vyScale} />;
                  })()}
                </g>

                {/* Grave sprite (has pointer events for click/hover) */}
                {grave && inGrid && (
                  <IsoGrave
                    cx={cx} cy={cy}
                    grave={grave}
                    zoom={1}
                    hovered={hovered?.id === grave.id}
                    isNew={newIds.has(grave.id)}
                    onClickGrave={() => { if (!dragRef.current.moved) setSelected(grave); }}
                    onHoverGrave={setHovered}
                  />
                )}
              </g>
            );
          })}

          {/* ── Ground mist — low-lying fog across bottom of grid ── */}
          <g style={{ pointerEvents: 'none' }} opacity={0.18}>
            {Array.from({ length: 6 }, (_, i) => {
              const r = totalRows - 1 - i;
              const { x: cx, y: cy } = toWorld(DISP_COLS / 2, r);
              const w = (DISP_COLS + 4 - i * 0.5) * TILE_W * 0.52;
              return (
                <ellipse key={i} cx={cx} cy={cy + TILE_H * 0.6}
                  rx={w} ry={TILE_H * (0.35 - i * 0.04)}
                  fill="#8090C0" opacity={0.12 - i * 0.015}
                />
              );
            })}
          </g>

          {/* ── Werewolf — walks on the graveyard tiles ── */}
          <WerewolfWalker totalRows={totalRows} />

          {/* ── Boundary dead trees — drawn after all tiles so they sit above cliff walls ── */}
          <g style={{ pointerEvents: 'none' }}>
            {boundaryTrees.map(({ col, row, flip }, i) => {
              const { x: cx, y: cy } = toWorld(col, row);
              return <DeadTree key={i} cx={cx} cy={cy} sc={0.7} flip={flip} />;
            })}
          </g>

          </g>
        </svg>

        {/* ── Bats + cobwebs — above world SVG (screen-fixed), around graveyard zone ── */}
        <Bat style={{ animationDuration: '22s', top: VH * 0.32 }} />
        <Bat style={{ animationDuration: '31s', top: VH * 0.44, animationDelay: '-12s' }} />
        <div className="bat-fly-low pointer-events-none absolute" style={{ animationDuration: '27s', top: VH * 0.52, animationDelay: '-8s' }}>
          <svg width="18" height="8" viewBox="0 0 22 10" style={{ imageRendering: 'pixelated' }} shapeRendering="crispEdges">
            <rect x="9" y="3" width="4" height="5" fill="#1a1828"/>
            <rect x="1" y="1" width="8" height="4" fill="#1a1828"/>
            <rect x="0" y="3" width="9" height="2" fill="#1a1828"/>
            <rect x="13" y="1" width="8" height="4" fill="#1a1828"/>
            <rect x="13" y="3" width="9" height="2" fill="#1a1828"/>
            <rect x="9" y="4" width="1" height="1" fill="#cc2222"/>
            <rect x="12" y="4" width="1" height="1" fill="#cc2222"/>
          </svg>
        </div>
        <div className="bat-fly-high pointer-events-none absolute" style={{ animationDuration: '38s', top: VH * 0.28, animationDelay: '-20s' }}>
          <svg width="14" height="6" viewBox="0 0 22 10" style={{ imageRendering: 'pixelated' }} shapeRendering="crispEdges">
            <rect x="9" y="3" width="4" height="5" fill="#1a1828"/>
            <rect x="1" y="1" width="8" height="4" fill="#1a1828"/>
            <rect x="0" y="3" width="9" height="2" fill="#1a1828"/>
            <rect x="13" y="1" width="8" height="4" fill="#1a1828"/>
            <rect x="13" y="3" width="9" height="2" fill="#1a1828"/>
            <rect x="9" y="4" width="1" height="1" fill="#cc2222"/>
            <rect x="12" y="4" width="1" height="1" fill="#cc2222"/>
          </svg>
        </div>
        <Bat style={{ animationDuration: '18s', top: VH * 0.38, animationDelay: '-5s' }} />
        <div className="pointer-events-none absolute left-0 top-0 z-10"><Cobweb /></div>
        <div className="pointer-events-none absolute right-0 top-0 z-10"><Cobweb flip /></div>
        <div className="pointer-events-none absolute z-10" style={{ left: '18%', top: 0, transform: 'scale(0.5)', transformOrigin: 'top left', opacity: 0.6 }}><Cobweb /></div>
        <div className="pointer-events-none absolute z-10" style={{ right: '18%', top: 0, transform: 'scale(0.5)', transformOrigin: 'top right', opacity: 0.6 }}><Cobweb flip /></div>
        <div className="pointer-events-none absolute z-10" style={{ left: 0, top: '18%', transform: 'scale(0.38) rotate(90deg)', transformOrigin: 'top left', opacity: 0.4 }}><Cobweb /></div>
        <div className="pointer-events-none absolute z-10" style={{ right: 0, top: '18%', transform: 'scale(0.38) rotate(-90deg)', transformOrigin: 'top right', opacity: 0.4 }}><Cobweb flip /></div>

        {/* ── Ghosts — rendered above SVG so they float in front of grid ── */}
        <Ghost cls="ghost-1" />
        <Ghost cls="ghost-2" />
        <Ghost cls="ghost-3" px={26} />
        <Ghost cls="ghost-4" px={20} />

        {/* ── Zoom controls ── */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1" style={{ zIndex: 100 }}>
          {([['＋', zoomIn], ['－', zoomOut]] as [string, () => void][]).map(([label, fn], i) => (
            <button key={i} onClick={fn} style={{
              width: 36, height: 36,
              background: 'rgba(13,11,30,0.92)',
              border: '1px solid #2A2450',
              color: '#C8A96E',
              fontFamily: 'var(--font-vt323)',
              fontSize: 22,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>{label}</button>
          ))}
        </div>

        {/* ── Hover tooltip ── */}
        {hovered && (
          <div className="pointer-events-none absolute" style={{
            left: mousePos.x + 14, top: mousePos.y - 14,
            zIndex: 2000,
            background: 'rgba(13,11,30,0.96)',
            border: '1px solid #2A2450',
            padding: '4px 10px 6px',
            maxWidth: 220,
          }}>
            <p style={{ fontFamily: 'var(--font-vt323)', fontSize: 18, color: '#C8A96E', margin: 0 }}>
              {hovered.subject}
            </p>
            {hovered.epitaph && (
              <p style={{ fontFamily: 'var(--font-vt323)', fontSize: 15, color: '#A89FC0', margin: 0 }}>
                &ldquo;{hovered.epitaph}&rdquo;
              </p>
            )}
            <p style={{ fontFamily: 'monospace', fontSize: 9, color: '#6B6480', margin: '3px 0 0' }}>
              click to read epitaph
            </p>
          </div>
        )}

        {/* ── Drag hint ── */}
        {showHint && (
          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 animate-pulse">
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'rgba(168,159,192,0.45)' }}>
              drag to explore · scroll to zoom
            </span>
          </div>
        )}

        {/* ── Empty state ── */}
        {graves.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, lineHeight: 2, color: '#545770', textAlign: 'center' }}>
              Nothing buried yet.<br />Suspicious.
            </p>
          </div>
        )}
      </div>

      {selected && <GraveModal grave={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
