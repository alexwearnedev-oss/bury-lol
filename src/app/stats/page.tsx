import { supabase } from '@/lib/supabase-server';
import Nav from '@/components/Nav';
import RandomGrave from './RandomGrave';
import Link from 'next/link';
import type { Grave } from '@/lib/types';

export const revalidate = 30;

const TIER_NAMES: Record<number, string> = {
  1: 'Shallow graves',
  2: 'Proper burials',
  3: 'Deluxe tombstones',
  4: 'Mausoleums',
};

const TIER_ICONS: Record<number, string> = {
  1: '🪨', 2: '🪦', 3: '⭐', 4: '👑',
};

export default async function StatsPage() {
  const [statsResult, newestResult, oldestResult, todayResult, tierResult, topVisitedResult] =
    await Promise.all([
      supabase.from('stats').select('total_approved, total_revenue_cents').single(),
      supabase
        .from('graves')
        .select('subject, epitaph, buried_by, created_at, icon, share_token, tier, grid_x')
        .eq('status', 'approved')
        .or('tier.eq.4,grid_x.not.is.null')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('graves')
        .select('subject, created_at, tier, grid_x')
        .eq('status', 'approved')
        .or('tier.eq.4,grid_x.not.is.null')
        .order('created_at', { ascending: true })
        .limit(1)
        .single(),
      supabase
        .from('graves')
        .select('id', { count: 'exact' })
        .eq('status', 'approved')
        .or('tier.eq.4,grid_x.not.is.null')
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      supabase
        .from('graves')
        .select('tier, grid_x')
        .eq('status', 'approved')
        .or('tier.eq.4,grid_x.not.is.null'),
      supabase
        .from('graves')
        .select('id, subject, epitaph, buried_by, icon, visit_count, share_token, created_at, tier, amount_paid, grid_x, grid_y, status, report_count')
        .eq('status', 'approved')
        .or('tier.eq.4,grid_x.not.is.null')
        .order('visit_count', { ascending: false })
        .limit(10),
    ]);

  const stats        = statsResult.data;
  const newest       = (newestResult.data ?? []) as Partial<Grave>[];
  const oldest       = newestResult.data ? oldestResult.data : null;
  const todayCount   = todayResult.count ?? 0;
  const allTiers     = tierResult.data ?? [];
  const topVisited   = (topVisitedResult.data ?? []) as Grave[];

  const tierCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const g of allTiers) tierCounts[g.tier as number] = (tierCounts[g.tier as number] ?? 0) + 1;

  const totalApproved  = stats?.total_approved ?? 0;
  const totalRevenue   = Math.floor((stats?.total_revenue_cents ?? 0) / 100);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return formatDate(iso);
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ background: '#0D0B1E' }}>
      <Nav />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        {/* ── Title ── */}
        <div className="mb-8 text-center">
          <h1 className="mb-1 text-cream" style={{ fontFamily: 'var(--font-pixel)', fontSize: 14 }}>
            GRAVEYARD STATS
          </h1>
          <p className="text-purple" style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}>
            ✦ HIGH SCORES ✦
          </p>
        </div>

        {/* ── Stat cards ── */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'TOTAL BURIED',  value: totalApproved.toLocaleString(),  color: 'text-gold' },
            { label: 'TODAY',         value: todayCount.toLocaleString(),      color: 'text-purpleLight' },
            { label: 'RAISED',        value: `$${totalRevenue.toLocaleString()}`, color: 'text-gold' },
            { label: 'TIERS',         value: '4',                             color: 'text-muted' },
          ].map(card => (
            <div
              key={card.label}
              className="pixel-border flex flex-col items-center gap-1 p-4"
              style={{ background: '#12102A' }}
            >
              <span className="text-dim" style={{ fontFamily: 'var(--font-pixel)', fontSize: 5 }}>
                {card.label}
              </span>
              <span className={card.color} style={{ fontFamily: 'var(--font-pixel)', fontSize: 16 }}>
                {card.value}
              </span>
            </div>
          ))}
        </div>

        {/* ── Capacity bar ── */}
        <div className="pixel-border mb-8 p-4" style={{ background: '#12102A' }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-dim" style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }}>
              GRAVEYARD CAPACITY
            </span>
            <span className="text-muted" style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }}>
              ∞
            </span>
          </div>
          <div className="h-3 overflow-hidden border border-border bg-bg">
            <div
              className="h-full bg-purple transition-all duration-500"
              style={{ width: `${Math.min(100, (totalApproved / 500) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-center text-dim" style={{ fontFamily: 'var(--font-vt323)', fontSize: 14 }}>
            {totalApproved.toLocaleString()} things the internet can finally grieve. The graveyard grows forever.
          </p>
        </div>

        {/* ── Most visited ── */}
        {topVisited.some(g => g.visit_count > 0) && (
          <div className="pixel-border mb-8" style={{ background: '#12102A' }}>
            <div className="border-b border-border px-4 py-3">
              <p className="text-cream" style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}>
                🏆 MOST VISITED
              </p>
            </div>
            {topVisited.filter(g => g.visit_count > 0).map((g, i) => (
              <Link
                key={g.id}
                href={`/grave/${g.share_token}`}
                className="flex items-center gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-surfaceHi last:border-b-0"
              >
                <span
                  className={`w-5 shrink-0 text-right ${i === 0 ? 'text-gold' : 'text-dim'}`}
                  style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}
                >
                  {i === 0 ? '★' : `${i + 1}.`}
                </span>
                <span className="text-xl shrink-0">{g.icon ?? '🪦'}</span>
                <span
                  className="flex-1 truncate text-cream"
                  style={{ fontFamily: 'var(--font-vt323)', fontSize: 18 }}
                >
                  {g.subject}
                </span>
                <span className="shrink-0 text-dim" style={{ fontFamily: 'var(--font-vt323)', fontSize: 16 }}>
                  {g.visit_count.toLocaleString()} 👁
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* ── Newest additions ── */}
        <div className="pixel-border mb-8" style={{ background: '#12102A' }}>
          <div className="border-b border-border px-4 py-3">
            <p className="text-cream" style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}>
              ✦ NEWEST ADDITIONS
            </p>
          </div>
          {newest.length > 0 ? newest.map((g, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <span className="text-xl shrink-0">{g.icon ?? '🪦'}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-cream" style={{ fontFamily: 'var(--font-vt323)', fontSize: 18 }}>
                  {g.subject}
                </p>
                <p className="text-dim" style={{ fontFamily: 'var(--font-vt323)', fontSize: 14 }}>
                  by {g.buried_by ?? 'Anonymous'}
                </p>
              </div>
              <span className="shrink-0 text-dim" style={{ fontFamily: 'var(--font-vt323)', fontSize: 14 }}>
                {timeAgo(g.created_at!)}
              </span>
            </div>
          )) : (
            <p className="px-4 py-6 text-center text-dim" style={{ fontFamily: 'var(--font-vt323)', fontSize: 16 }}>
              Nothing buried yet. Suspicious.
            </p>
          )}
        </div>

        {/* ── Tier breakdown ── */}
        <div className="pixel-border mb-8 p-4" style={{ background: '#12102A' }}>
          <p className="mb-4 text-cream" style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}>
            ⚰ BY TIER
          </p>
          <div className="space-y-3">
            {[1,2,3,4].map(tier => {
              const count = tierCounts[tier] ?? 0;
              const max   = Math.max(...Object.values(tierCounts), 1);
              return (
                <div key={tier}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-muted" style={{ fontFamily: 'var(--font-vt323)', fontSize: 16 }}>
                      {TIER_ICONS[tier]} {TIER_NAMES[tier]}
                    </span>
                    <span className="text-cream" style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}>
                      {count.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden border border-border bg-bg">
                    <div
                      className={`h-full transition-all ${tier === 4 ? 'bg-purple' : tier === 3 ? 'bg-gold/60' : 'bg-purpleDark'}`}
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── First burial ── */}
        {oldest && (
          <div className="pixel-border mb-8 p-4 text-center" style={{ background: '#12102A' }}>
            <p className="mb-1 text-dim" style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }}>
              FIRST BURIAL
            </p>
            <p className="text-cream" style={{ fontFamily: 'var(--font-vt323)', fontSize: 20 }}>
              &ldquo;{oldest.subject}&rdquo;
            </p>
            <p className="text-muted" style={{ fontFamily: 'var(--font-vt323)', fontSize: 14 }}>
              {formatDate(oldest.created_at)}
            </p>
          </div>
        )}

        {/* ── Random grave ── */}
        <div className="pixel-border p-6 text-center" style={{ background: '#12102A' }}>
          <p className="mb-4 text-dim" style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }}>
            EXHUME A RANDOM GRAVE
          </p>
          <RandomGrave />
        </div>
      </main>

      <footer className="border-t border-border px-4 py-4 text-center text-dim"
        style={{ fontFamily: 'var(--font-vt323)', fontSize: 14 }}>
        Made by the internet, for the internet. No one is in charge here.
      </footer>
    </div>
  );
}
