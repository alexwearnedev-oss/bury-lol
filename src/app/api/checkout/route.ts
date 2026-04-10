import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { stripe, TIER_CONFIG } from '@/lib/stripe';
import { checkoutRateLimit } from '@/lib/rate-limit';
import { checkoutSchema } from '@/lib/validation';
import { createSuccessToken } from '@/lib/success-token';
import { getClientIp } from '@/lib/get-client-ip';

export async function POST(request: NextRequest) {
  // Rate limit first
  const ip = getClientIp(request);
  const { success } = await checkoutRateLimit.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  // Parse and validate input
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 }
    );
  }

  const result = checkoutSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const { subject, epitaph, buried_by, tier, icon, preferred_x, preferred_y } = result.data;
  const tierKey = tier as keyof typeof TIER_CONFIG;
  const config = TIER_CONFIG[tierKey];

  // Pre-generate share_token so it can be embedded in the success URL token
  // and stored in Stripe metadata for the webhook to use on insert.
  const shareToken = randomBytes(6).toString('hex');

  // Build signed success token — carries all display data through the Stripe redirect.
  // This lets /success render without a Supabase query or an API endpoint.
  const successToken = await createSuccessToken(
    {
      subject,
      epitaph:     epitaph     || null,
      buried_by:   buried_by   || 'Anonymous',
      tier:        tier as 1 | 2 | 3 | 4,
      amount_paid: config.amount,
      icon:        icon         || null,
      share_token: shareToken,
    },
    process.env.STRIPE_SECRET_KEY!,
  );

  // Create Stripe Checkout session
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: config.amount,
            product_data: {
              name: `${config.name} for "${subject}"`,
              description: epitaph || 'No epitaph provided',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?t=${successToken}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bury`,
      metadata: {
        subject,
        epitaph:     epitaph     || '',
        buried_by:   buried_by   || 'Anonymous',
        tier:        String(tier),
        icon:        icon         || '',
        share_token: shareToken,
        preferred_x: preferred_x != null ? String(preferred_x) : '',
        preferred_y: preferred_y != null ? String(preferred_y) : '',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
