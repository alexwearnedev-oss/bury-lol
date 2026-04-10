import Link from 'next/link';
import { supabase } from '@/lib/supabase-server';
import Nav from '@/components/Nav';
import type { Grave, Stats } from '@/lib/types';

export const revalidate = 60;

// ── Pixel-art graveyard gate hero ─────────────────────────────────────────
function GraveyardGate() {
  return (
    <svg
      width="320" height="200"
      viewBox="0 0 320 200"
      style={{ imageRendering: 'pixelated', display: 'block', margin: '0 auto' }}
      shapeRendering="crispEdges"
    >
      {/* Stars */}
      {[
        [18,12],[52,8],[90,18],[130,6],[170,14],[210,8],[255,18],[290,10],
        [35,30],[75,22],[115,28],[155,10],[195,22],[240,28],[278,20],
        [10,48],[60,38],[105,44],[148,32],[188,40],[228,36],[270,44],[308,30],
      ].map(([x,y],i) => (
        <rect key={i} x={x} y={y} width={i%5===0?2:1} height={i%5===0?2:1} fill="#ffffff" opacity={0.35 + (i%3)*0.15} />
      ))}

      {/* Moon */}
      <rect x="268" y="14" width="28" height="18" fill="#e8e0c8" />
      <rect x="272" y="10" width="20" height="26" fill="#e8e0c8" />
      <rect x="270" y="12" width="24" height="22" fill="#e8e0c8" />
      <rect x="276" y="18" width="5"  height="5"  fill="#ccc8b0" />
      <rect x="284" y="23" width="3"  height="3"  fill="#ccc8b0" />

      {/* Ground */}
      <rect x="0" y="180" width="320" height="20" fill="#0D0B1E" />
      <rect x="0" y="177" width="320" height="4"  fill="#2D5A35" opacity="0.6" />

      {/* Iron fence — bottom strip */}
      {Array.from({length:16}).map((_,i) => (
        <g key={i}>
          <rect x={i*20+2}  y="162" width="4" height="18" fill="#1A1835" />
          <rect x={i*20+2}  y="158" width="4" height="6"  fill="#2A2450" />
          <rect x={i*20+3}  y="156" width="2" height="4"  fill="#6B5DB8" opacity="0.4" />
        </g>
      ))}
      <rect x="0" y="174" width="320" height="4" fill="#2A2450" />

      {/* Left small tombstone */}
      <path d="M 18 106 L 38 106 L 38 116 L 44 116 L 44 162 L 12 162 L 12 116 L 18 116 Z" fill="#12102A" />
      <path d="M 18 106 L 38 106 L 38 116 L 44 116 L 44 158 L 12 158 L 12 116 L 18 116 Z" fill="#1A1835" />
      <rect x="12" y="116" width="3" height="42" fill="#2A2450" />
      <text x="28" y="135" textAnchor="middle" fontSize="7" fill="#C8A96E" fontFamily="monospace">RIP</text>
      <text x="28" y="147" textAnchor="middle" fontSize="5" fill="#6B6480" fontFamily="monospace">vine</text>

      {/* Right small tombstone */}
      <path d="M 282 112 L 302 112 L 302 122 L 308 122 L 308 162 L 276 162 L 276 122 L 282 122 Z" fill="#12102A" />
      <path d="M 282 112 L 302 112 L 302 122 L 308 122 L 308 158 L 276 158 L 276 122 L 282 122 Z" fill="#1A1835" />
      <rect x="276" y="122" width="3" height="36" fill="#2A2450" />
      <text x="292" y="139" textAnchor="middle" fontSize="7" fill="#C8A96E" fontFamily="monospace">RIP</text>
      <text x="292" y="151" textAnchor="middle" fontSize="5" fill="#6B6480" fontFamily="monospace">flash</text>

      {/* Gate — left stone pillar */}
      <rect x="76"  y="46" width="28" height="126" fill="#12102A" />
      <rect x="78"  y="46" width="24" height="122" fill="#1A1835" />
      <rect x="78"  y="46" width="5"  height="122" fill="#2A2450" />
      <rect x="78"  y="46" width="24" height="4"   fill="#2A2450" />
      {/* pillar decorative band */}
      <rect x="78"  y="80" width="24" height="3"   fill="#2A2450" />
      <rect x="78"  y="130" width="24" height="3"  fill="#2A2450" />

      {/* Gate — right stone pillar */}
      <rect x="216" y="46" width="28" height="126" fill="#12102A" />
      <rect x="218" y="46" width="24" height="122" fill="#1A1835" />
      <rect x="238" y="46" width="4"  height="122" fill="#2A2450" />
      <rect x="218" y="46" width="24" height="4"   fill="#2A2450" />
      <rect x="218" y="80" width="24" height="3"   fill="#2A2450" />
      <rect x="218" y="130" width="24" height="3"  fill="#2A2450" />

      {/* Gate — top arch */}
      <rect x="72"  y="38" width="176" height="12" fill="#12102A" />
      <rect x="72"  y="40" width="176" height="8"  fill="#2A2450" />
      <rect x="76"  y="40" width="168" height="3"  fill="#6B5DB8" opacity="0.25" />

      {/* Gate — inner darkness */}
      <rect x="104" y="50" width="112" height="122" fill="#08080F" />

      {/* Gate bars */}
      {[110,124,138,152,166,180,194,208].map((x,i) => (
        <g key={i}>
          <rect x={x} y="52" width="5" height="116" fill="#1A1835" />
          <rect x={x} y="52" width="2" height="116" fill="#2A2450" />
          {/* spear tip */}
          <rect x={x+1} y="48" width="3" height="6" fill="#6B5DB8" opacity="0.5" />
        </g>
      ))}

      {/* Skull decoration on arch */}
      <rect x="156" y="34" width="8" height="6"  fill="#1A1835" />
      <rect x="154" y="36" width="12" height="6" fill="#1A1835" />
      <rect x="156" y="38" width="3"  height="2" fill="#2A2450" />
      <rect x="161" y="38" width="3"  height="2" fill="#2A2450" />
      <rect x="157" y="40" width="6"  height="2" fill="#2A2450" opacity="0.6" />
    </svg>
  );
}

// ── Recent burial row ─────────────────────────────────────────────────────
function BurialRow({ grave, rank }: { grave: Grave; rank: number }) {
  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <Link
      href={`/grave/${grave.share_token}`}
      className="flex items-center gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-surfaceHi"
    >
      <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }} className="text-dim w-4 shrink-0">
        {rank}.
      </span>
      <span className="text-xl leading-none shrink-0">
        {grave.icon ?? '🪦'}
      </span>
      <span className="flex-1 truncate" style={{ fontFamily: 'var(--font-vt323)', fontSize: 18 }}>
        {grave.subject}
      </span>
      <span className="shrink-0 text-dim" style={{ fontFamily: 'var(--font-vt323)', fontSize: 14 }}>
        {timeAgo(grave.created_at)}
      </span>
    </Link>
  );
}

export default async function Home() {
  const [gravesResult, statsResult] = await Promise.all([
    supabase
      .from('graves')
      .select('id, subject, epitaph, buried_by, tier, amount_paid, share_token, grid_x, grid_y, created_at, status, report_count, icon, visit_count')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('stats').select('total_approved, total_revenue_cents').single(),
  ]);

  const recentGraves = (gravesResult.data ?? []) as Grave[];
  const stats = statsResult.data as Stats | null;
  const totalApproved  = stats?.total_approved ?? 0;
  const totalRevenueDollars = Math.floor((stats?.total_revenue_cents ?? 0) / 100);

  return (
    <div className="flex min-h-screen flex-col" style={{ background: '#0D0B1E' }}>
      <Nav />

      <main className="flex flex-1 flex-col items-center">
        {/* ── Hero ── */}
        <section className="flex w-full flex-col items-center px-4 pt-12 pb-8">
          {/* Pixel art gate */}
          <div className="mb-6">
            <GraveyardGate />
          </div>

          {/* Branding */}
          <p
            className="mb-1 text-dim tracking-widest"
            style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}
          >
            EST. 2024
          </p>
          <h1
            className="mb-4 text-center text-cream"
            style={{ fontFamily: 'var(--font-pixel)', fontSize: 18, lineHeight: 1.6 }}
          >
            bury.lol
          </h1>
          <p
            className="mb-8 max-w-sm text-center text-muted"
            style={{ fontFamily: 'var(--font-vt323)', fontSize: 20 }}
          >
            A final resting place for things the internet loved and lost.
          </p>

          {/* Stat pills */}
          <div className="mb-8 flex flex-wrap justify-center gap-4">
            <div className="stat-pill">
              <span className="text-dim" style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }}>
                SOULS AT REST
              </span>
              <span className="text-gold" style={{ fontFamily: 'var(--font-pixel)', fontSize: 16 }}>
                {totalApproved.toLocaleString()}
              </span>
            </div>
            <div className="stat-pill">
              <span className="text-dim" style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }}>
                RAISED FROM THE DEAD
              </span>
              <span className="text-gold" style={{ fontFamily: 'var(--font-pixel)', fontSize: 16 }}>
                ${totalRevenueDollars.toLocaleString()}
              </span>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/graveyard"
              className="btn-outline px-6 py-3"
              style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}
            >
              ☠ Enter the Graveyard
            </Link>
            <Link
              href="/bury"
              className="btn-purple px-6 py-3"
              style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}
            >
              🪦 Dig a grave — $2
            </Link>
          </div>
        </section>

        {/* ── Recent burials ── */}
        <section className="w-full max-w-xl px-4 pb-12">
          <div className="mb-3 flex items-center justify-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span
              className="text-dim tracking-widest"
              style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}
            >
              ✦ RECENT BURIALS ✦
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="pixel-border overflow-hidden" style={{ background: '#12102A' }}>
            {recentGraves.length > 0 ? (
              recentGraves.map((g, i) => (
                <BurialRow key={g.id} grave={g} rank={i + 1} />
              ))
            ) : (
              <p
                className="px-4 py-8 text-center text-dim"
                style={{ fontFamily: 'var(--font-vt323)', fontSize: 18 }}
              >
                Nothing buried yet. Suspicious.
              </p>
            )}
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/graveyard"
              className="text-muted transition-colors hover:text-cream"
              style={{ fontFamily: 'var(--font-vt323)', fontSize: 16 }}
            >
              View all graves in the graveyard →
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border px-4 py-5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 sm:flex-row">
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }} className="text-dim">
            🪦 bury.lol
          </span>
          <span style={{ fontFamily: 'var(--font-vt323)', fontSize: 14 }} className="text-dim text-center">
            Made by the internet, for the internet. No one is in charge here.
          </span>
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }} className="text-dim">
            🪦 {totalApproved} / ∞ plots claimed
          </span>
        </div>
      </footer>
    </div>
  );
}
