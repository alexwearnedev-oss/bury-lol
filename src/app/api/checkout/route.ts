import { NextRequest, NextResponse } from 'next/server';
import { stripe, TIER_CONFIG } from '@/lib/stripe';
import { checkoutRateLimit } from '@/lib/rate-limit';
import { checkoutSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  // Rate limit first
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
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

  const { subject, epitaph, buried_by, tier } = result.data;
  const tierKey = tier as keyof typeof TIER_CONFIG;
  const config = TIER_CONFIG[tierKey];

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
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bury`,
      metadata: {
        subject,
        epitaph: epitaph || '',
        buried_by: buried_by || 'Anonymous',
        tier: String(tier),
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
