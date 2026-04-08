import Link from 'next/link';
import { supabase } from '@/lib/supabase-server';
import Nav from '@/components/Nav';
import GraveyardCanvas from '@/components/GraveyardCanvas';
import type { Grave, Stats } from '@/lib/types';

export const revalidate = 60;

export default async function GraveyardPage() {
  const [gravesResult, statsResult] = await Promise.all([
    supabase
      .from('graves')
      .select('id, subject, epitaph, buried_by, tier, amount_paid, share_token, grid_x, grid_y, created_at, status, report_count, icon, visit_count')
      .eq('status', 'approved')
      .order('created_at', { ascending: true }),
    supabase.from('stats').select('total_approved, total_revenue_cents').single(),
  ]);

  const rawGraves = (gravesResult.data ?? []) as Grave[];
  // TEST: 7 spread graves — remove this filter before launch
  const step = rawGraves.length > 7 ? Math.floor(rawGraves.length / 7) : 1;
  const allGraves = rawGraves.length > 7
    ? rawGraves.filter((_, i) => i % step === 0).slice(0, 7)
    : rawGraves;
  const stats     = statsResult.data as Stats | null;

  const totalApproved = stats?.total_approved ?? 0;
  const totalRevenue  = stats?.total_revenue_cents ?? 0;

  const statsLabel = totalApproved > 0
    ? `${totalApproved.toLocaleString()} souls at rest · $${Math.floor(totalRevenue / 100).toLocaleString()} raised`
    : null;

  return (
    <div className="flex min-h-screen flex-col" style={{ background: '#08080f' }}>
      <Nav />

      {/* ── Canvas sub-header ── */}
      <div
        className="border-b border-border px-4 py-2 text-center"
        style={{ background: 'rgba(13,11,30,0.9)' }}
      >
        <p style={{ fontFamily: 'var(--font-pixel)', fontSize: 9 }} className="text-cream mb-0.5">
          THE GRAVEYARD
        </p>
        {statsLabel && (
          <p style={{ fontFamily: 'var(--font-vt323)', fontSize: 14 }} className="text-muted">
            {statsLabel}
          </p>
        )}
        <p style={{ fontFamily: 'var(--font-vt323)', fontSize: 13 }} className="text-dim mt-0.5">
          Drag to explore · Scroll to zoom · Click a tombstone to read its epitaph
        </p>
      </div>

      {/* ── Graveyard canvas ── */}
      <main className="flex flex-1 flex-col">
        <GraveyardCanvas initialGraves={allGraves} />
      </main>

      {/* ── Mobile floating CTA ── */}
      <div className="fixed bottom-6 right-6 z-40 sm:hidden">
        <Link
          href="/bury"
          className="btn-purple flex items-center gap-2 px-5 py-3 shadow-lg"
          style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}
        >
          🪦 Dig a grave →
        </Link>
      </div>

      <footer className="border-t border-border px-4 py-4 text-center text-dim"
        style={{ fontFamily: 'var(--font-vt323)', fontSize: 14 }}>
        Made by the internet, for the internet. No one is in charge here.
      </footer>
    </div>
  );
}
