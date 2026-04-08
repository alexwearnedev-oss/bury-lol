import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { supabase, supabaseAdmin } from '@/lib/supabase-server';
import Nav from '@/components/Nav';
import Tombstone from '@/components/Tombstone';
import type { Grave } from '@/lib/types';

interface Props { params: { shareToken: string } }

async function getGrave(shareToken: string): Promise<Grave | null> {
  const { data } = await supabase
    .from('graves')
    .select('id, subject, epitaph, buried_by, tier, amount_paid, share_token, grid_x, grid_y, created_at, status, report_count, icon, visit_count')
    .eq('share_token', shareToken)
    .eq('status', 'approved')
    .single();
  return data as Grave | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const grave = await getGrave(params.shareToken);
  if (!grave) return { title: 'Grave not found — bury.lol' };
  const ogUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/og?token=${params.shareToken}`;
  return {
    title: `RIP ${grave.subject} — bury.lol`,
    description: grave.epitaph || `Buried on bury.lol for $${(grave.amount_paid / 100).toFixed(0)}`,
    openGraph: {
      title: `RIP ${grave.subject}`,
      description: grave.epitaph || 'Buried on bury.lol',
      images: [{ url: ogUrl, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `RIP ${grave.subject}`,
      description: grave.epitaph || 'Buried on bury.lol',
      images: [ogUrl],
    },
  };
}

export default async function GravePage({ params }: Props) {
  const grave = await getGrave(params.shareToken);
  if (!grave) notFound();

  // Increment visit count server-side (non-critical, fire-and-forget)
  try {
    await supabaseAdmin.rpc('increment_visit_count', { grave_share_token: params.shareToken });
  } catch { /* non-critical */ }

  const buriedDate = new Date(grave.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const shareUrl  = `${process.env.NEXT_PUBLIC_BASE_URL}/grave/${grave.share_token}`;
  const tweetText = `I just buried ${grave.subject} on bury.lol for $${(grave.amount_paid / 100).toFixed(0)}. RIP. ${shareUrl}`;

  const tierNames: Record<number, string> = {
    1: 'Shallow grave', 2: 'Proper burial', 3: 'Deluxe tombstone', 4: 'The Mausoleum',
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ background: '#0D0B1E' }}>
      <Nav />

      <main className="flex flex-1 flex-col items-center px-4 py-12">
        {/* Tombstone — scaled up */}
        <div className="mb-8 scale-110 transform sm:scale-150">
          <Tombstone
            subject={grave.subject}
            epitaph={grave.epitaph ?? undefined}
            buried_by={grave.buried_by}
            icon={grave.icon}
            tier={grave.tier}
          />
        </div>

        {/* Details card */}
        <div className="pixel-border mt-8 w-full max-w-sm p-5" style={{ background: '#12102A' }}>
          <h1
            className="mb-1 text-center text-cream"
            style={{ fontFamily: 'var(--font-vt323)', fontSize: 28 }}
          >
            RIP {grave.subject}
          </h1>
          {grave.epitaph && (
            <p
              className="mb-3 text-center text-muted italic"
              style={{ fontFamily: 'var(--font-vt323)', fontSize: 18 }}
            >
              &ldquo;{grave.epitaph}&rdquo;
            </p>
          )}
          <div className="space-y-1 border-t border-border pt-3 text-center">
            <p className="text-dim" style={{ fontFamily: 'var(--font-vt323)', fontSize: 16 }}>
              Buried by {grave.buried_by} · {buriedDate}
            </p>
            <p className="text-dim" style={{ fontFamily: 'var(--font-vt323)', fontSize: 15 }}>
              ${(grave.amount_paid / 100).toFixed(0)} paid · {tierNames[grave.tier]}
            </p>
            {grave.visit_count > 0 && (
              <p className="text-purple" style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }}>
                {grave.visit_count.toLocaleString()} visits
              </p>
            )}
          </div>
        </div>

        {/* Share buttons */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-purple px-5 py-2.5"
            style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}
          >
            Share on X
          </a>
          <Link
            href="/graveyard"
            className="btn-outline px-5 py-2.5"
            style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}
          >
            Visit graveyard
          </Link>
        </div>

        <Link
          href="/bury"
          className="mt-4 text-muted transition-colors hover:text-cream"
          style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }}
        >
          Dig your own grave →
        </Link>
      </main>

      <footer className="border-t border-border px-4 py-4 text-center text-dim"
        style={{ fontFamily: 'var(--font-vt323)', fontSize: 14 }}>
        Made by the internet, for the internet. No one is in charge here.
      </footer>
    </div>
  );
}
