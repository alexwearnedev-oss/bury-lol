import Link from 'next/link';
import { supabase } from '@/lib/supabase-server';
import RandomGrave from './RandomGrave';

export const revalidate = 30;

const TIER_NAMES: Record<number, string> = {
  1: 'Shallow graves',
  2: 'Proper burials',
  3: 'Deluxe tombstones',
  4: 'Mausoleums',
};

export default async function StatsPage() {
  const [statsResult, newestResult, oldestResult, todayResult, tierResult, mostBuriedResult] =
    await Promise.all([
      supabase.from('stats').select('total_approved, total_revenue_cents').single(),
      supabase
        .from('graves')
        .select('subject, created_at')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('graves')
        .select('subject, created_at')
        .eq('status', 'approved')
        .order('created_at', { ascending: true })
        .limit(1)
        .single(),
      supabase
        .from('graves')
        .select('id', { count: 'exact' })
        .eq('status', 'approved')
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      supabase
        .from('graves')
        .select('tier')
        .eq('status', 'approved'),
      supabase
        .from('graves')
        .select('subject')
        .eq('status', 'approved'),
    ]);

  const stats = statsResult.data;
  const newest = newestResult.data;
  const oldest = oldestResult.data;
  const todayCount = todayResult.count ?? 0;
  const allGraves = tierResult.data ?? [];
  const allSubjects = mostBuriedResult.data ?? [];

  // Tier breakdown
  const tierCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const g of allGraves) {
    tierCounts[g.tier as number] = (tierCounts[g.tier as number] ?? 0) + 1;
  }

  // Most buried subject
  const subjectFreq: Record<string, number> = {};
  for (const g of allSubjects) {
    const key = g.subject.toLowerCase().trim();
    subjectFreq[key] = (subjectFreq[key] ?? 0) + 1;
  }
  const mostBuried = Object.entries(subjectFreq).sort((a, b) => b[1] - a[1])[0];

  const totalApproved = stats?.total_approved ?? 0;
  const totalRevenue = Math.floor((stats?.total_revenue_cents ?? 0) / 100);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex items-center justify-between border-b border-stone/20 px-4 py-3">
        <Link href="/" className="font-serif text-xl font-bold tracking-tight text-cream">
          bury.lol
        </Link>
        <Link href="/bury" className="rounded bg-cream px-4 py-2 text-sm font-medium text-bg hover:opacity-90">
          Dig a grave &rarr;
        </Link>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-16">
        {/* Hero numbers */}
        <div className="mb-12 text-center">
          <p className="mb-2 font-serif text-4xl font-bold text-cream">
            {totalApproved.toLocaleString()}
          </p>
          <p className="text-stone">
            things the internet can finally grieve.
          </p>
          <p className="mt-4 font-serif text-2xl text-cream">
            ${totalRevenue.toLocaleString()}
          </p>
          <p className="text-stone">raised from the dead.</p>
        </div>

        {/* Stats grid */}
        <div className="mb-12 space-y-6 border-t border-stone/20 pt-8">

          {newest && (
            <div className="flex items-start justify-between gap-4">
              <span className="text-sm text-stone">Newest burial</span>
              <span className="text-right text-sm text-cream">
                &ldquo;{newest.subject}&rdquo;
                <span className="ml-2 text-xs text-stone/60">— {timeAgo(newest.created_at)}</span>
              </span>
            </div>
          )}

          {mostBuried && mostBuried[1] > 1 && (
            <div className="flex items-start justify-between gap-4">
              <span className="text-sm text-stone">Most buried</span>
              <span className="text-right text-sm text-cream">
                &ldquo;{mostBuried[0]}&rdquo;
                <span className="ml-2 text-xs text-stone/60">— {mostBuried[1]} times</span>
              </span>
            </div>
          )}

          <div className="flex items-start justify-between gap-4">
            <span className="text-sm text-stone">Buried today</span>
            <span className="text-sm text-cream">{todayCount} graves dug</span>
          </div>

          {oldest && (
            <div className="flex items-start justify-between gap-4">
              <span className="text-sm text-stone">First burial</span>
              <span className="text-right text-sm text-cream">
                &ldquo;{oldest.subject}&rdquo;
                <span className="ml-2 text-xs text-stone/60">— {formatDate(oldest.created_at)}</span>
              </span>
            </div>
          )}
        </div>

        {/* Tier breakdown */}
        <div className="mb-12 border-t border-stone/20 pt-8">
          <p className="mb-4 text-xs uppercase tracking-widest text-stone/60">By tier</p>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((tier) => (
              <div key={tier} className="flex items-center justify-between">
                <span className="text-sm text-stone">{TIER_NAMES[tier]}</span>
                <span className="text-sm text-cream">{(tierCounts[tier] ?? 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Random grave */}
        <div className="border-t border-stone/20 pt-8 text-center">
          <RandomGrave />
        </div>
      </main>

      <footer className="border-t border-stone/20 px-4 py-4 text-center text-xs text-stone">
        Made by the internet, for the internet. No one is in charge here.
      </footer>
    </div>
  );
}
