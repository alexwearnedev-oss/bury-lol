import Link from 'next/link';
import { supabase } from '@/lib/supabase-server';
import GraveyardCanvas from '@/components/GraveyardCanvas';
import MausoleumRow from '@/components/MausoleumRow';
import type { Grave, Stats } from '@/lib/types';

// ISR — revalidate every 60 seconds
export const revalidate = 60;

export default async function Home() {
  const [gravesResult, statsResult] = await Promise.all([
    supabase
      .from('graves')
      .select('id, subject, epitaph, buried_by, tier, amount_paid, share_token, grid_x, grid_y, created_at, status, report_count')
      .eq('status', 'approved')
      .order('created_at', { ascending: true }),
    supabase.from('stats').select('total_approved, total_revenue_cents').single(),
  ]);

  const allGraves = (gravesResult.data ?? []) as Grave[];
  const stats = statsResult.data as Stats | null;

  const mausoleumGraves = allGraves.filter(g => g.tier === 4).slice(-10);
  const regularGraves   = allGraves.filter(g => g.tier !== 4);

  const totalApproved = stats?.total_approved ?? 0;
  const totalRevenue  = stats?.total_revenue_cents ?? 0;

  const statsLabel = totalApproved > 0
    ? `${totalApproved.toLocaleString()} souls at rest · $${Math.floor(totalRevenue / 100).toLocaleString()} raised`
    : null;

  return (
    <div className="flex min-h-screen flex-col" style={{ background: '#08080f' }}>

      {/* ── Sticky top bar ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-stone/20 px-4 py-3"
        style={{ background: 'rgba(8,8,15,0.95)', backdropFilter: 'blur(4px)' }}>

        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 11 }} className="text-cream tracking-tight">
          bury.lol
        </span>

        {statsLabel && (
          <span className="hidden text-stone sm:block" style={{ fontFamily: 'var(--font-vt323)', fontSize: 16 }}>
            {statsLabel}
          </span>
        )}

        <Link
          href="/bury"
          className="rounded px-4 py-2 text-bg transition-opacity hover:opacity-90"
          style={{ background: '#c8c4b8', fontFamily: 'var(--font-pixel)', fontSize: 8 }}
        >
          Dig a grave →
        </Link>
      </header>

      {/* ── Mausoleum Row ── */}
      {mausoleumGraves.length > 0 && (
        <MausoleumRow graves={mausoleumGraves} />
      )}

      {/* ── Graveyard canvas (fills remaining height) ── */}
      <main className="flex flex-1 flex-col">
        <GraveyardCanvas initialGraves={regularGraves} />
      </main>

      {/* ── Mobile floating CTA ── */}
      <div className="fixed bottom-6 right-6 z-40 sm:hidden">
        <Link
          href="/bury"
          className="flex items-center gap-2 rounded px-5 py-3 text-bg shadow-lg transition-opacity hover:opacity-90"
          style={{ background: '#c8c4b8', fontFamily: 'var(--font-pixel)', fontSize: 7 }}
        >
          Dig a grave →
        </Link>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-stone/20 px-4 py-4 text-center text-stone"
        style={{ fontFamily: 'var(--font-vt323)', fontSize: 14 }}>
        Made by the internet, for the internet. No one is in charge here.
      </footer>
    </div>
  );
}
