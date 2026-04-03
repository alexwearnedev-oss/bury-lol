import Link from 'next/link';
import { supabase } from '@/lib/supabase-server';
import GraveyardGrid from '@/components/GraveyardGrid';
import MausoleumRow from '@/components/MausoleumRow';
import type { Grave, Stats } from '@/lib/types';

// ISR — revalidate every 60 seconds
export const revalidate = 60;

export default async function Home() {
  // Fetch approved graves and stats in parallel
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

  // Split mausoleum (tier 4) from regular — max 10 mausoleums visible
  const mausoleumGraves = allGraves.filter((g) => g.tier === 4).slice(-10);
  const regularGraves = allGraves.filter((g) => g.tier !== 4);

  const totalApproved = stats?.total_approved ?? 0;
  const totalRevenue = stats?.total_revenue_cents ?? 0;

  const statsLabel =
    totalApproved > 0
      ? `${totalApproved.toLocaleString()} souls at rest · $${Math.floor(totalRevenue / 100).toLocaleString()} raised`
      : null;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-stone/20 bg-bg/95 px-4 py-3 backdrop-blur-sm">
        <span className="font-serif text-xl font-bold tracking-tight text-cream">
          bury.lol
        </span>

        {statsLabel && (
          <span className="hidden text-xs text-stone sm:block">
            {statsLabel}
          </span>
        )}

        <Link
          href="/bury"
          className="rounded bg-cream px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90"
        >
          Dig a grave &rarr;
        </Link>
      </header>

      {/* Mausoleum Row — only visible when at least one Mausoleum exists */}
      {mausoleumGraves.length > 0 && (
        <MausoleumRow graves={mausoleumGraves} />
      )}

      {/* Graveyard canvas */}
      <main className="flex-1">
        <GraveyardGrid initialGraves={regularGraves} />
      </main>

      {/* Mobile floating CTA */}
      <div className="fixed bottom-6 right-6 z-40 sm:hidden">
        <Link
          href="/bury"
          className="flex items-center gap-2 rounded-full bg-cream px-5 py-3 text-sm font-medium text-bg shadow-lg transition-opacity hover:opacity-90"
        >
          Dig a grave &rarr;
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-stone/20 px-4 py-4 text-center text-xs text-stone">
        Made by the internet, for the internet. No one is in charge here.
      </footer>
    </div>
  );
}
