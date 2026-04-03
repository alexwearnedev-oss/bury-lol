// Pixel-art tombstone SVG components — one design per tier

export const TIER_DIMS = {
  1: { w: 60,  h: 78  },
  2: { w: 72,  h: 94  },
  3: { w: 104, h: 136 },
  4: { w: 196, h: 260 },
} as const;

interface TombstoneProps {
  subject: string;
  epitaph?: string;
  buried_by?: string;
  tier: 1 | 2 | 3 | 4;
  className?: string;
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
  shadow:    '#1c1c28',
  back:      '#333344',
  face:      '#545770',
  hilight:   '#6a6c84',
  textDim:   '#8e90a8',
  textBright:'#c4c6dc',
  rip:       '#cc9966',
  // Mausoleum
  mauve:     '#2e2d42',
  mauFace:   '#3a394f',
  mauCol:    '#484660',
  mauRoof:   '#262535',
  mauHi:     '#5a5870',
  mauDoor:   '#080710',
  mauText:   '#9088cc',
};

// ── Tier 1 — shallow grave (60 × 78) ─────────────────────────────────────────
function Tier1({ subject }: { subject: string }) {
  const lines = wrap(subject, 7, 3);
  return (
    <>
      {/* drop shadow */}
      <path d="M 15 3 L 51 3 L 51 13 L 60 13 L 60 81 L 3 81 L 3 13 L 15 13 Z" fill={C.shadow} />
      {/* stone back */}
      <path d="M 12 0 L 48 0 L 48 10 L 57 10 L 57 78 L 0 78 L 0 10 L 12 10 Z" fill={C.back} />
      {/* stone face */}
      <path d="M 12 0 L 48 0 L 48 10 L 57 10 L 57 74 L 0 74 L 0 10 L 12 10 Z" fill={C.face} />
      {/* left highlight */}
      <rect x="0" y="10" width="4" height="64" fill={C.hilight} />
      {/* top highlight */}
      <path d="M 12 0 L 48 0 L 48 4 L 57 4 L 57 10 L 0 10 L 0 4 L 12 4 Z" fill={C.hilight} />
      {/* RIP */}
      <text x="28" y="24" textAnchor="middle" fontSize="12" fill={C.rip}
        style={{ fontFamily: 'var(--font-vt323), monospace' }}>RIP</text>
      {/* subject lines */}
      {lines.map((line, i) => (
        <text key={i} x="28" y={38 + i * 12} textAnchor="middle" fontSize="10" fill={C.textDim}
          style={{ fontFamily: 'var(--font-vt323), monospace' }}>{line}</text>
      ))}
    </>
  );
}

// ── Tier 2 — proper burial (72 × 94) ─────────────────────────────────────────
function Tier2({ subject, epitaph }: { subject: string; epitaph?: string }) {
  const subLines = wrap(subject, 8, 3);
  const epiLine = epitaph ? wrap(epitaph, 9, 1)[0] : null;
  return (
    <>
      {/* drop shadow */}
      <path d="M 18 3 L 58 3 L 58 13 L 66 13 L 66 23 L 74 23 L 74 97 L 2 97 L 2 23 L 10 23 L 10 13 L 18 13 Z" fill={C.shadow} />
      {/* stone back */}
      <path d="M 16 0 L 56 0 L 56 10 L 64 10 L 64 20 L 72 20 L 72 94 L 0 94 L 0 20 L 8 20 L 8 10 L 16 10 Z" fill={C.back} />
      {/* stone face */}
      <path d="M 16 0 L 56 0 L 56 10 L 64 10 L 64 20 L 72 20 L 72 90 L 0 90 L 0 20 L 8 20 L 8 10 L 16 10 Z" fill={C.face} />
      {/* left highlight */}
      <rect x="0" y="20" width="4" height="70" fill={C.hilight} />
      {/* top highlight */}
      <path d="M 16 0 L 56 0 L 56 4 L 64 4 L 64 10 L 68 10 L 68 20 L 0 20 L 0 10 L 4 10 L 4 4 L 16 4 Z" fill={C.hilight} />
      {/* RIP */}
      <text x="36" y="36" textAnchor="middle" fontSize="14" fill={C.rip}
        style={{ fontFamily: 'var(--font-vt323), monospace' }}>RIP</text>
      {/* subject */}
      {subLines.map((line, i) => (
        <text key={i} x="36" y={52 + i * 13} textAnchor="middle" fontSize="11" fill={C.textBright}
          style={{ fontFamily: 'var(--font-vt323), monospace' }}>{line}</text>
      ))}
      {/* epitaph snippet */}
      {epiLine && (
        <text x="36" y="88" textAnchor="middle" fontSize="9" fill={C.textDim}
          style={{ fontFamily: 'var(--font-vt323), monospace' }}>
          {epiLine.length > 9 ? epiLine.slice(0, 8) + '…' : epiLine}
        </text>
      )}
    </>
  );
}

// ── Tier 3 — deluxe tombstone (104 × 136) ────────────────────────────────────
function Tier3({ subject, epitaph }: { subject: string; epitaph?: string }) {
  const subLines = wrap(subject, 10, 3);
  const epiLines = epitaph ? wrap(epitaph, 11, 2) : [];
  return (
    <>
      {/* cross */}
      <rect x="49" y="1"  width="6"  height="22" fill={C.back} />
      <rect x="39" y="7"  width="26" height="6"  fill={C.back} />
      <rect x="49" y="1"  width="4"  height="20" fill={C.face} />
      <rect x="39" y="7"  width="24" height="4"  fill={C.face} />
      <rect x="49" y="1"  width="4"  height="4"  fill={C.hilight} />
      <rect x="39" y="7"  width="4"  height="4"  fill={C.hilight} />

      {/* drop shadow */}
      <path d="M 27 23 L 79 23 L 79 35 L 93 35 L 93 47 L 107 47 L 107 139 L 3 139 L 3 47 L 11 47 L 11 35 L 27 35 Z" fill={C.shadow} />
      {/* stone back */}
      <path d="M 24 20 L 80 20 L 80 32 L 92 32 L 92 44 L 104 44 L 104 136 L 0 136 L 0 44 L 12 44 L 12 32 L 24 32 Z" fill={C.back} />
      {/* stone face */}
      <path d="M 24 20 L 80 20 L 80 32 L 92 32 L 92 44 L 104 44 L 104 132 L 0 132 L 0 44 L 12 44 L 12 32 L 24 32 Z" fill={C.face} />
      {/* ornate border */}
      <path d="M 28 24 L 76 24 L 76 34 L 88 34 L 88 48 L 100 48 L 100 128 L 4 128 L 4 48 L 16 48 L 16 34 L 28 34 Z"
        fill="none" stroke={C.hilight} strokeWidth="1" />
      {/* corner gems */}
      {([[4,48],[96,48],[4,124],[96,124]] as [number,number][]).map(([x,y],i) => (
        <rect key={i} x={x} y={y} width="4" height="4" fill={C.hilight} />
      ))}
      {/* left highlight */}
      <rect x="0" y="44" width="5" height="88" fill={C.hilight} />
      {/* top highlight */}
      <path d="M 24 20 L 80 20 L 80 25 L 92 25 L 92 44 L 0 44 L 0 25 L 12 25 L 12 20 L 24 20 Z" fill={C.hilight} />

      {/* RIP */}
      <text x="52" y="62" textAnchor="middle" fontSize="16" fill={C.rip}
        style={{ fontFamily: 'var(--font-vt323), monospace' }}>RIP</text>
      {/* subject */}
      {subLines.map((line, i) => (
        <text key={i} x="52" y={80 + i * 14} textAnchor="middle" fontSize="12" fill={C.textBright}
          style={{ fontFamily: 'var(--font-vt323), monospace' }}>{line}</text>
      ))}
      {/* epitaph */}
      {epiLines.map((line, i) => (
        <text key={i} x="52" y={118 + i * 11} textAnchor="middle" fontSize="10" fill={C.textDim}
          style={{ fontFamily: 'var(--font-vt323), monospace' }}>{line}</text>
      ))}
    </>
  );
}

// ── Tier 4 — the mausoleum (196 × 260) ───────────────────────────────────────
function Tier4Mausoleum({ subject, epitaph }: { subject: string; epitaph?: string }) {
  const subLines = wrap(subject, 13, 2);
  const epiLines = epitaph ? wrap(epitaph, 14, 2) : [];
  return (
    <>
      {/* ── Stepped pyramid roof ── */}
      <rect x="90"  y="0"  width="16"  height="8"  fill={C.mauRoof} />
      <rect x="74"  y="8"  width="48"  height="8"  fill={C.mauRoof} />
      <rect x="58"  y="16" width="80"  height="8"  fill={C.mauRoof} />
      <rect x="42"  y="24" width="112" height="8"  fill={C.mauRoof} />
      <rect x="16"  y="32" width="164" height="20" fill={C.mauRoof} />
      {/* Pediment highlight */}
      <rect x="16"  y="32" width="164" height="4"  fill={C.mauHi} />
      {/* Triglyphs */}
      {[32, 60, 88, 116, 144, 164].map(x => (
        <g key={x}>
          <rect x={x}   y="38" width="3" height="10" fill={C.mauHi} opacity="0.5" />
          <rect x={x+6} y="38" width="3" height="10" fill={C.mauHi} opacity="0.5" />
        </g>
      ))}

      {/* ── Entablature ── */}
      <rect x="16" y="52" width="164" height="14" fill={C.mauFace} />
      <rect x="16" y="52" width="164" height="3"  fill={C.mauHi} opacity="0.4" />

      {/* ── Building body ── */}
      <rect x="32" y="66" width="132" height="132" fill={C.mauve} />

      {/* ── 4 columns ── */}
      {([16, 54, 126, 164] as number[]).map(x => (
        <g key={x}>
          <rect x={x-2} y="64"  width="20" height="6"   fill={C.mauHi} opacity="0.6" />
          <rect x={x}   y="70"  width="16" height="122" fill={C.mauCol} />
          <rect x={x}   y="70"  width="4"  height="122" fill={C.mauHi} opacity="0.35" />
          <rect x={x-2} y="192" width="20" height="6"   fill={C.mauHi} opacity="0.4" />
        </g>
      ))}

      {/* ── Entrance arch ── */}
      <rect x="76" y="136" width="44" height="62" fill={C.mauDoor} />
      <rect x="72" y="140" width="52" height="58" fill={C.mauDoor} />
      <rect x="68" y="146" width="60" height="52" fill={C.mauDoor} />

      {/* ── MAUSOLEUM label ── */}
      <text x="98" y="84" textAnchor="middle" fontSize="6" fill={C.mauText} letterSpacing="2"
        style={{ fontFamily: 'var(--font-pixel), monospace' }}>MAUSOLEUM</text>

      {/* ── Subject ── */}
      {subLines.map((line, i) => (
        <text key={i} x="98" y={102 + i * 16} textAnchor="middle" fontSize="14" fill={C.textBright}
          style={{ fontFamily: 'var(--font-vt323), monospace' }}>{line}</text>
      ))}
      {/* ── Epitaph ── */}
      {epiLines.map((line, i) => (
        <text key={i} x="98" y={132 + i * 12} textAnchor="middle" fontSize="11" fill={C.mauText}
          style={{ fontFamily: 'var(--font-vt323), monospace' }}>{line}</text>
      ))}

      {/* ── Steps ── */}
      <rect x="12" y="198" width="172" height="10" fill={C.back} />
      <rect x="6"  y="208" width="184" height="10" fill={C.back} />
      <rect x="0"  y="218" width="196" height="10" fill={C.back} />
      <rect x="12" y="198" width="172" height="3"  fill={C.hilight} />
      <rect x="6"  y="208" width="184" height="3"  fill={C.hilight} />
      <rect x="0"  y="218" width="196" height="3"  fill={C.hilight} />

      {/* ── Base ── */}
      <rect x="0" y="228" width="196" height="32" fill={C.back} />
      <rect x="0" y="228" width="196" height="4"  fill={C.hilight} />
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function Tombstone({
  subject, epitaph, tier, className = '',
}: TombstoneProps) {
  const { w, h } = TIER_DIMS[tier];
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ imageRendering: 'pixelated', display: 'block' }}
      shapeRendering="crispEdges"
      className={className}
    >
      {tier === 1 && <Tier1 subject={subject} />}
      {tier === 2 && <Tier2 subject={subject} epitaph={epitaph} />}
      {tier === 3 && <Tier3 subject={subject} epitaph={epitaph} />}
      {tier === 4 && <Tier4Mausoleum subject={subject} epitaph={epitaph} />}
    </svg>
  );
}
