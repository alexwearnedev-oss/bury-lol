import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-server';
import { hashIP } from '@/lib/hash-ip';
import GraveConfirmationEmail from '../../../../emails/GraveConfirmation';

const resend = new Resend(process.env.RESEND_API_KEY);

// Keyword blocklist — auto-reject graves containing these terms
// Common slurs and harassment terms — expand before going live
const BLOCKLIST: string[] = [
  // Racial slurs
  'nigger', 'nigga', 'chink', 'spic', 'kike', 'wetback', 'gook', 'coon',
  // Homophobic/transphobic slurs
  'faggot', 'tranny', 'dyke',
  // Targeted harassment patterns
  'kill yourself', 'kys', 'go die', 'neck yourself',
  // Spam/URL indicators
  'http://', 'https://', 'www.', '.com', '.net', '.org', '.io',
  // Sexual harassment
  'rape', 'molest',
];

function containsBlocklisted(text: string): boolean {
  return BLOCKLIST.some((term) => text.toLowerCase().includes(term));
}

export async function POST(request: NextRequest) {
  // Read raw body for signature verification
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata;

    if (!meta?.subject || !meta?.tier) {
      console.error('Missing metadata on checkout session:', session.id);
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    const subject   = meta.subject;
    const epitaph   = meta.epitaph   || null;
    const buried_by = meta.buried_by || 'Anonymous';
    const tier      = parseInt(meta.tier);
    const icon      = meta.icon      || null;

    // Check blocklist — still write to DB for audit trail, but auto-reject
    const isBlocked =
      containsBlocklisted(subject) ||
      (epitaph ? containsBlocklisted(epitaph) : false);

    const ipHash = hashIP(request.headers.get('x-forwarded-for'));

    // Write grave to Supabase
    const { data: grave, error: dbError } = await supabaseAdmin
      .from('graves')
      .insert({
        subject,
        epitaph,
        buried_by,
        tier,
        icon,
        stripe_session_id: session.id,
        amount_paid: session.amount_total ?? 0,
        paid_at: new Date().toISOString(),
        status: isBlocked ? 'rejected' : 'pending',
        rejection_reason: isBlocked ? 'auto-rejected: blocklist' : null,
        ip_hash: ipHash,
      })
      .select('share_token')
      .single();

    if (dbError) {
      console.error('Supabase insert error:', dbError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Send confirmation email via Resend (only if email exists and not blocked)
    if (session.customer_details?.email && !isBlocked) {
      const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/grave/${grave.share_token}`;
      try {
        await resend.emails.send({
          from: 'bury.lol <noreply@bury.lol>',
          to: session.customer_details.email,
          subject: `RIP ${subject} — your grave is being dug`,
          react: GraveConfirmationEmail({
            subject,
            epitaph: epitaph ?? undefined,
            tier,
            shareUrl,
            amount: session.amount_total ?? 0,
          }),
        });
      } catch (emailErr) {
        // Log but don't fail the webhook — the grave is already saved
        console.error('Resend email error:', emailErr);
      }
    }
  }

  return NextResponse.json({ received: true });
}
