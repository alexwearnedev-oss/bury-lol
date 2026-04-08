// Pixel-art tombstone SVG components — one design per tier
// Icons rendered as Twemoji overlay on top of the stone face.

export const TIER_DIMS = {
  1: { w: 60,  h: 78  },
  2: { w: 72,  h: 94  },
  3: { w: 104, h: 136 },
  4: { w: 196, h: 260 },
} as const;

// Icon overlay layout: position as fraction of display w/h, size as fraction of display w
const ICON_LAYOUT: Record<number, { cx: number; cy: number; r: number }> = {
  1: { cx: 0.47, cy: 0.16, r: 0.29 },
  2: { cx: 0.50, cy: 0.22, r: 0.27 },
  3: { cx: 0.50, cy: 0.36, r: 0.24 },
  4: { cx: 0.50, cy: 0.28, r: 0.18 },
};

// Convert emoji character → Twemoji CDN SVG URL
function emojiToTwemojiUrl(emoji: string): string {
  const codepoints = Array.from(emoji)
    .map(c => c.codePointAt(0)!)
    .filter(cp => cp !== 0xfe0f) // strip variation selector-16
    .map(cp => cp.toString(16))
    .join('-');
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codepoints}.svg`;
}

interface TombstoneProps {
  subject:     string;
  epitaph?:    string;
  buried_by?:  string;
  tier:        1 | 2 | 3 | 4;
  icon?:       string | null;
  className?:  string;
  width?:      number;
  height?:     number;
  previewOnly?: boolean; // show stone shape only — no text or icon
}

// Wrap text into lines ≤ maxChars, capped at maxLines
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (candidate.length <= maxChars) {
      cur = candidate;
    } else {
      if (cur) lines.push(cur);
      cur = w.slice(0, maxChars);
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  shadow:     '#1c1c28',
  back:       '#333344',
  face:       '#545770',
  hilight:    '#6a6c84',
  textDim:    '#8e90a8',
  textBright: '#c4c6dc',
  rip:        '#C8A96E',  // updated to new gold
  // Mausoleum
  mauve:      '#2e2d42',
  mauFace:    '#3a394f',
  mauCol:     '#484660',
  mauRoof:    '#262535',
  mauHi:      '#5a5870',
  mauDoor:    '#080710',
  mauText:    '#9B8FD8',  // updated to new purpleLight
};

// ── Tier 1 — shallow grave (60 × 78) — crumbled round arch ───────────────────
function Tier1({ subject, hasIcon }: { subject: string; hasIcon: boolean }) {
  const lines = wrap(subject, 7, 2);
  const ripY = hasIcon ? 36 : 28;
  const subY = hasIcon ? 50 : 42;
  return (
    <>
      {/* Shadow layer — round arch approximation */}
      <rect x="21" y="3"  width="21" height="4"  fill={C.shadow} />
      <rect x="15" y="7"  width="33" height="4"  fill={C.shadow} />
      <rect x="9"  y="11" width="45" height="4"  fill={C.shadow} />
      <rect x="3"  y="15" width="57" height="66" fill={C.shadow} />
      {/* Back layer */}
      <rect x="18" y="0"  width="24" height="4"  fill={C.back} />
      <rect x="12" y="4"  width="36" height="4"  fill={C.back} />
      <rect x="6"  y="8"  width="48" height="4"  fill={C.back} />
      <rect x="0"  y="12" width="60" height="66" fill={C.back} />
      {/* Face layer */}
      <rect x="18" y="0"  width="24" height="4"  fill={C.face} />
      <rect x="12" y="4"  width="36" height="4"  fill={C.face} />
      <rect x="6"  y="8"  width="48" height="4"  fill={C.face} />
      <rect x="0"  y="12" width="60" height="62" fill={C.face} />
      {/* Left highlight */}
      <rect x="0" y="12" width="4" height="62" fill={C.hilight} />
      {/* Arch top highlight */}
      <rect x="18" y="0" width="24" height="2" fill={C.hilight} />
      {/* Cracks */}
      <rect x="22" y="16" width="2" height="20" fill={C.shadow} opacity="0.75" />
      <rect x="24" y="34" width="8"  height="2" fill={C.shadow} opacity="0.55" />
      <rect x="40" y="22" width="2" height="12" fill={C.shadow} opacity="0.5"  />
      {/* Chipped arch — missing bite top-left */}
      <rect x="6"  y="8"  width="6" height="6" fill={C.back} />
      {/* Heavy moss at base */}
      <rect x="2"  y="56" width="56" height="18" fill="#2A3A18" opacity="0.6" />
      {!hasIcon && (
        <text x="30" y={ripY} textAnchor="middle" fontSize="10" fill={C.rip}
          style={{ fontFamily: 'var(--font-vt323), monospace' }}>RIP</text>
      )}
      {lines.map((line, i) => (
        <text key={i} x="30" y={subY + i * 12} textAnchor="middle" fontSize="9" fill={C.textDim}
          style={{ fontFamily: 'var(--font-vt323), monospace' }}>{line}</text>
      ))}
    </>
  );
}

// ── Tier 2 — proper burial (72 × 94) ─────────────────────────────────────────
function Tier2({ subject, epitaph, hasIcon }: { subject: string; epitaph?: string; hasIcon: boolean }) {
  const subLines = wrap(subject, 8, 3);
  const epiLine  = epitaph ? wrap(epitaph, 9, 1)[0] : null;
  const ripY = hasIcon ? 46 : 36;
  const subY = hasIcon ? 62 : 52;
  return (
    <>
      <path d="M 18 3 L 58 3 L 58 13 L 66 13 L 66 23 L 74 23 L 74 97 L 2 97 L 2 23 L 10 23 L 10 13 L 18 13 Z" fill={C.shadow} />
      <path d="M 16 0 L 56 0 L 56 10 L 64 10 L 64 20 L 72 20 L 72 94 L 0 94 L 0 20 L 8 20 L 8 10 L 16 10 Z" fill={C.back} />
      <path d="M 16 0 L 56 0 L 56 10 L 64 10 L 64 20 L 72 20 L 72 90 L 0 90 L 0 20 L 8 20 L 8 10 L 16 10 Z" fill={C.face} />
      <rect x="0" y="20" width="4" height="70" fill={C.hilight} />
      <path d="M 16 0 L 56 0 L 56 4 L 64 4 L 64 10 L 68 10 L 68 20 L 0 20 L 0 10 L 4 10 L 4 4 L 16 4 Z" fill={C.hilight} />
      {!hasIcon && (
        <text x="36" y={ripY} textAnchor="middle" fontSize="14" fill={C.rip}
          style={{ fontFamily: 'var(--font-vt323), monospace' }}>RIP</text>
      )}
      {subLines.map((line, i) => (
        <text key={i} x="36" y={subY + i * 13} textAnchor="middle" fontSize="11" fill={C.textBright}
          style={{ fontFamily: 'var(--font-vt323), monospace' }}>{line}</text>
      ))}
      {epiLine && (
        <text x="36" y="88" textAnchor="middle" fontSize="9" fill={C.textDim}
          style={{ fontFamily: 'var(--font-vt323), monospace' }}>
          {epiLine.length > 9 ? epiLine.slice(0, 8) + '…' : epiLine}
        </text>
      )}
    </>
  );
}

// ── Tier 3 — deluxe tombstone (104 × 136) — Celtic Cross ─────────────────────
function Tier3({ subject, epitaph, hasIcon }: { subject: string; epitaph?: string; hasIcon: boolean }) {
  const subLines = wrap(subject, 9, 2);
  const epiLine  = epitaph ? wrap(epitaph, 10, 1)[0] : null;
  const ripY  = hasIcon ? 82 : 74;
  const subY  = hasIcon ? 96 : 88;
  // Cross geometry (viewBox 0 0 104 136)
  const shX = 40, shW = 24;          // shaft x, width
  const aY  = 26, aH  = 20;          // arm y, height
  const rCX = 52, rCY = 36, rR = 22; // ring centre + radius
  return (
    <>
      {/* Shadow layer */}
      <rect x={shX+3} y="3"     width={shW} height="136" fill={C.shadow} />
      <rect x="3"     y={aY+3}  width="104" height={aH}  fill={C.shadow} />
      {/* Ring shadow (pixel circle) */}
      <rect x={rCX-rR+3}       y={rCY-rR+3}       width={rR*2}   height={rR*2}   fill={C.shadow} />
      <rect x={rCX-rR*0.7+3}   y={rCY-rR*1.3+3}   width={rR*1.4} height={rR*2.6} fill={C.shadow} />
      <rect x={rCX-rR*1.3+3}   y={rCY-rR*0.7+3}   width={rR*2.6} height={rR*1.4} fill={C.shadow} />
      {/* Back layer */}
      <rect x={shX} y="0"  width={shW} height="136" fill={C.back} />
      <rect x="0"   y={aY} width="104" height={aH}  fill={C.back} />
      {/* Ring back */}
      <rect x={rCX-rR}     y={rCY-rR}     width={rR*2}   height={rR*2}   fill={C.back} />
      <rect x={rCX-rR*0.7} y={rCY-rR*1.3} width={rR*1.4} height={rR*2.6} fill={C.back} />
      <rect x={rCX-rR*1.3} y={rCY-rR*0.7} width={rR*2.6} height={rR*1.4} fill={C.back} />
      {/* Face layer */}
      <rect x={shX} y="0"  width={shW} height="136" fill={C.face} />
      <rect x="0"   y={aY} width="104" height={aH}  fill={C.face} />
      {/* Ring face */}
      <rect x={rCX-rR}     y={rCY-rR}     width={rR*2}   height={rR*2}   fill={C.face} />
      <rect x={rCX-rR*0.7} y={rCY-rR*1.3} width={rR*1.4} height={rR*2.6} fill={C.face} />
      <rect x={rCX-rR*1.3} y={rCY-rR*0.7} width={rR*2.6} height={rR*1.4} fill={C.face} />
      {/* Ring inner cutout */}
      <rect x={rCX-rR*0.5} y={rCY-rR*0.5} width={rR} height={rR} fill={C.back} />
      {/* Left highlights */}
      <rect x={shX} y="0"  width="4" height="136" fill={C.hilight} />
      <rect x="0"   y={aY} width="4" height={aH}  fill={C.hilight} />
      {/* Top of shaft highlight */}
      <rect x={shX} y="0" width={shW} height="2" fill={C.hilight} />
      {!hasIcon && (
        <text x="52" y={ripY} textAnchor="middle" fontSize="14" fill={C.rip}
          style={{ fontFamily: 'var(--font-vt323), monospace' }}>RIP</text>
      )}
      {subLines.map((line, i) => (
        <text key={i} x="52" y={subY + i * 14} textAnchor="middle" fontSize="12" fill={C.textBright}
          style={{ fontFamily: 'var(--font-vt323), monospace' }}>{line}</text>
      ))}
      {epiLine && (
        <text x="52" y="124" textAnchor="middle" fontSize="9" fill={C.textDim}
          style={{ fontFamily: 'var(--font-vt323), monospace' }}>{epiLine}</text>
      )}
    </>
  );
}

// ── Tier 4 — the mausoleum (196 × 260) ───────────────────────────────────────
function Tier4Mausoleum({ subject, epitaph, hasIcon }: { subject: string; epitaph?: string; hasIcon: boolean }) {
  const subLines = wrap(subject, 13, 2);
  const epiLines = epitaph ? wrap(epitaph, 14, 2) : [];
  const labelY = hasIcon ? 114 : 84;
  const subY   = hasIcon ? 132 : 102;
  const epiY   = hasIcon ? 162 : 132;
  return (
    <>
      {/* Stepped pyramid roof */}
      <rect x="90"  y="0"  width="16"  height="8"  fill={C.mauRoof} />
      <rect x="74"  y="8"  width="48"  height="8"  fill={C.mauRoof} />
      <rect x="58"  y="16" width="80"  height="8"  fill={C.mauRoof} />
      <rect x="42"  y="24" width="112" height="8"  fill={C.mauRoof} />
      <rect x="16"  y="32" width="164" height="20" fill={C.mauRoof} />
      <rect x="16"  y="32" width="164" height="4"  fill={C.mauHi} />
      {[32, 60, 88, 116, 144, 164].map(x => (
        <g key={x}>
          <rect x={x}   y="38" width="3" height="10" fill={C.mauHi} opacity="0.5" />
          <rect x={x+6} y="38" width="3" height="10" fill={C.mauHi} opacity="0.5" />
        </g>
      ))}
      {/* Entablature */}
      <rect x="16" y="52" width="164" height="14" fill={C.mauFace} />
      <rect x="16" y="52" width="164" height="3"  fill={C.mauHi} opacity="0.4" />
      {/* Body */}
      <rect x="32" y="66" width="132" height="132" fill={C.mauve} />
      {/* Columns */}
      {([16, 54, 126, 164] as number[]).map(x => (
        <g key={x}>
          <rect x={x-2} y="64"  width="20" height="6"   fill={C.mauHi} opacity="0.6" />
          <rect x={x}   y="70"  width="16" height="122" fill={C.mauCol} />
          <rect x={x}   y="70"  width="4"  height="122" fill={C.mauHi} opacity="0.35" />
          <rect x={x-2} y="192" width="20" height="6"   fill={C.mauHi} opacity="0.4" />
        </g>
      ))}
      {/* Entrance arch */}
      <rect x="76" y="136" width="44" height="62" fill={C.mauDoor} />
      <rect x="72" y="140" width="52" height="58" fill={C.mauDoor} />
      <rect x="68" y="146" width="60" height="52" fill={C.mauDoor} />
      {/* Text */}
      <text x="98" y={labelY} textAnchor="middle" fontSize="6" fill={C.mauText} letterSpacing="2"
        style={{ fontFamily: 'var(--font-pixel), monospace' }}>MAUSOLEUM</text>
      {subLines.map((line, i) => (
        <text key={i} x="98" y={subY + i * 16} textAnchor="middle" fontSize="14" fill={C.textBright}
          style={{ fontFamily: 'var(--font-vt323), monospace' }}>{line}</text>
      ))}
      {epiLines.map((line, i) => (
        <text key={i} x="98" y={epiY + i * 12} textAnchor="middle" fontSize="11" fill={C.mauText}
          style={{ fontFamily: 'var(--font-vt323), monospace' }}>{line}</text>
      ))}
      {/* Steps */}
      <rect x="12" y="198" width="172" height="10" fill={C.back} />
      <rect x="6"  y="208" width="184" height="10" fill={C.back} />
      <rect x="0"  y="218" width="196" height="10" fill={C.back} />
      <rect x="12" y="198" width="172" height="3"  fill={C.hilight} />
      <rect x="6"  y="208" width="184" height="3"  fill={C.hilight} />
      <rect x="0"  y="218" width="196" height="3"  fill={C.hilight} />
      {/* Base */}
      <rect x="0" y="228" width="196" height="32" fill={C.back} />
      <rect x="0" y="228" width="196" height="4"  fill={C.hilight} />
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function Tombstone({
  subject, epitaph, tier, icon, className = '',
  width: overrideW, height: overrideH, previewOnly = false,
}: TombstoneProps) {
  const { w, h } = TIER_DIMS[tier];
  const displayW = overrideW ?? w;
  const displayH = overrideH ?? h;
  // previewOnly: suppress all text and icon rendering
  const hasIcon  = previewOnly ? true : !!icon;
  const displaySubject = previewOnly ? '' : subject;
  const displayEpitaph = previewOnly ? undefined : epitaph;

  // Calculate icon overlay in screen-space pixels
  let iconEl: React.ReactNode = null;
  if (!previewOnly && hasIcon && icon) {
    const { cx, cy, r } = ICON_LAYOUT[tier];
    const iconSize = r * displayW;
    const iconLeft = cx * displayW - iconSize / 2;
    const iconTop  = cy * displayH - iconSize / 2;
    iconEl = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={emojiToTwemojiUrl(icon)}
        alt={icon}
        width={iconSize}
        height={iconSize}
        style={{
          position:        'absolute',
          left:            iconLeft,
          top:             iconTop,
          width:           iconSize,
          height:          iconSize,
          imageRendering:  'pixelated',
          pointerEvents:   'none',
        }}
      />
    );
  }

  return (
    <div
      style={{ position: 'relative', width: displayW, height: displayH, display: 'inline-block' }}
      className={className}
    >
      <svg
        width={displayW}
        height={displayH}
        viewBox={`0 0 ${w} ${h}`}
        style={{ imageRendering: 'pixelated', display: 'block' }}
        shapeRendering="crispEdges"
      >
        {tier === 1 && <Tier1 subject={displaySubject} hasIcon={hasIcon} />}
        {tier === 2 && <Tier2 subject={displaySubject} epitaph={displayEpitaph} hasIcon={hasIcon} />}
        {tier === 3 && <Tier3 subject={displaySubject} epitaph={displayEpitaph} hasIcon={hasIcon} />}
        {tier === 4 && <Tier4Mausoleum subject={displaySubject} epitaph={displayEpitaph} hasIcon={hasIcon} />}
      </svg>
      {iconEl}
    </div>
  );
}
