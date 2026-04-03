import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase-server';
import Tombstone from '@/components/Tombstone';
import type { Grave } from '@/lib/types';

interface Props {
  params: { shareToken: string };
}

async function getGrave(shareToken: string): Promise<Grave | null> {
  const { data } = await supabase
    .from('graves')
    .select('id, subject, epitaph, buried_by, tier, amount_paid, share_token, grid_x, grid_y, created_at, status, report_count')
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

  const buriedDate = new Date(grave.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/grave/${grave.share_token}`;
  const tweetText = `I just buried ${grave.subject} on bury.lol for $${(grave.amount_paid / 100).toFixed(0)}. RIP. ${shareUrl}`;

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

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        {/* Large tombstone */}
        <div className="mb-8 scale-110 transform sm:scale-150">
          <Tombstone
            subject={grave.subject}
            epitaph={grave.epitaph ?? undefined}
            buried_by={grave.buried_by}
            tier={grave.tier}
          />
        </div>

        {/* Details */}
        <div className="mt-8 space-y-2 text-center">
          <h1 className="font-serif text-3xl font-bold text-cream">
            RIP {grave.subject}
          </h1>
          {grave.epitaph && (
            <p className="text-stone italic">&ldquo;{grave.epitaph}&rdquo;</p>
          )}
          <p className="text-sm text-stone/70">
            Buried by {grave.buried_by} &middot; {buriedDate}
          </p>
          <p className="text-xs text-stone/40">
            ${(grave.amount_paid / 100).toFixed(0)} paid &middot; Tier {grave.tier}
          </p>
        </div>

        {/* Share buttons */}
        <div className="mt-8 flex gap-3">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-stone/30 px-5 py-2.5 text-sm text-cream hover:border-cream/50"
          >
            Share on X
          </a>
          <Link
            href="/"
            className="rounded border border-stone/30 px-5 py-2.5 text-sm text-cream hover:border-cream/50"
          >
            Visit the graveyard
          </Link>
        </div>
      </main>

      <footer className="border-t border-stone/20 px-4 py-4 text-center text-xs text-stone">
        Made by the internet, for the internet. No one is in charge here.
      </footer>
    </div>
  );
}
