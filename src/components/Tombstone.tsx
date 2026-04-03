interface TombstoneProps {
  subject: string;
  epitaph?: string;
  buried_by?: string;
  tier: 1 | 2 | 3 | 4;
  className?: string;
}

const TIER_SIZES = {
  1: { width: 80, height: 100 },
  2: { width: 80, height: 100 },
  3: { width: 120, height: 150 },
  4: { width: 240, height: 300 },
} as const;

const TIER_LABELS: Record<number, string> = {
  1: '',
  2: '',
  3: '',
  4: 'MAUSOLEUM',
};

export default function Tombstone({
  subject,
  epitaph,
  buried_by,
  tier,
  className = '',
}: TombstoneProps) {
  const { width, height } = TIER_SIZES[tier];
  const isMausoleum = tier === 4;
  const isDeluxe = tier === 3;

  // Scale font sizes based on tier
  const subjectSize = tier === 4 ? 16 : tier === 3 ? 10 : 8;
  const epitaphSize = tier === 4 ? 11 : tier === 3 ? 7.5 : 6;
  const metaSize = tier === 4 ? 9 : tier === 3 ? 6.5 : 5;

  // Arch radius proportional to width
  const archRadius = width * 0.25;
  const archY = archRadius + 4;

  // Build the tombstone path: flat bottom, straight sides, rounded arch top
  const path = `
    M ${width * 0.05} ${height}
    L ${width * 0.05} ${archY}
    Q ${width * 0.05} 4, ${width * 0.25} 4
    Q ${width * 0.5} ${4 - archRadius * 0.4}, ${width * 0.75} 4
    Q ${width * 0.95} 4, ${width * 0.95} ${archY}
    L ${width * 0.95} ${height}
    Z
  `;

  return (
    <div
      className={`inline-block ${isMausoleum ? 'tombstone-mausoleum' : ''} ${className}`}
      style={{ width, height }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Tombstone shape */}
        <path
          d={path}
          fill="#2a2a28"
          stroke={isMausoleum ? '#3C3489' : isDeluxe ? '#888780' : '#444440'}
          strokeWidth={isMausoleum ? 2 : isDeluxe ? 1.5 : 1}
        />

        {/* Mausoleum crown arch */}
        {isMausoleum && (
          <path
            d={`M ${width * 0.3} ${archY + 8} Q ${width * 0.5} ${archY - 8}, ${width * 0.7} ${archY + 8}`}
            fill="none"
            stroke="#3C3489"
            strokeWidth={1.5}
          />
        )}

        {/* Mausoleum label */}
        {isMausoleum && (
          <text
            x={width / 2}
            y={archY + 22}
            textAnchor="middle"
            fill="#3C3489"
            fontFamily="Courier New, monospace"
            fontSize={8}
            letterSpacing={2}
          >
            {TIER_LABELS[4]}
          </text>
        )}

        {/* Subject */}
        <text
          x={width / 2}
          y={isMausoleum ? height * 0.35 : height * 0.38}
          textAnchor="middle"
          fill="#F5F0E8"
          fontFamily="Courier New, monospace"
          fontSize={subjectSize}
          fontWeight="bold"
        >
          {subject.length > (tier === 4 ? 30 : tier === 3 ? 18 : 12)
            ? subject.slice(0, tier === 4 ? 27 : tier === 3 ? 15 : 9) + '...'
            : subject}
        </text>

        {/* Divider line */}
        <line
          x1={width * 0.2}
          y1={isMausoleum ? height * 0.4 : height * 0.45}
          x2={width * 0.8}
          y2={isMausoleum ? height * 0.4 : height * 0.45}
          stroke="#555550"
          strokeWidth={0.5}
        />

        {/* Epitaph */}
        {epitaph && (
          <text
            x={width / 2}
            y={isMausoleum ? height * 0.5 : height * 0.58}
            textAnchor="middle"
            fill="#888780"
            fontFamily="Courier New, monospace"
            fontSize={epitaphSize}
          >
            {epitaph.length > (tier === 4 ? 40 : tier === 3 ? 22 : 14)
              ? epitaph.slice(0, tier === 4 ? 37 : tier === 3 ? 19 : 11) + '...'
              : epitaph}
          </text>
        )}

        {/* RIP / cross */}
        <text
          x={width / 2}
          y={isMausoleum ? height * 0.65 : height * 0.72}
          textAnchor="middle"
          fill="#555550"
          fontFamily="serif"
          fontSize={isMausoleum ? 14 : tier === 3 ? 9 : 7}
        >
          &#x271D;
        </text>

        {/* Buried by */}
        {buried_by && buried_by !== 'Anonymous' && (
          <text
            x={width / 2}
            y={height * 0.88}
            textAnchor="middle"
            fill="#555550"
            fontFamily="Courier New, monospace"
            fontSize={metaSize}
          >
            &mdash; {buried_by}
          </text>
        )}
      </svg>
    </div>
  );
}
