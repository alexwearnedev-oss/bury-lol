import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
  typescript: true,
});

export const TIER_CONFIG = {
  1: { amount: 100, name: 'A shallow grave' },
  2: { amount: 200, name: 'A proper burial' },
  3: { amount: 500, name: 'Deluxe tombstone' },
  4: { amount: 5000, name: 'The Mausoleum' },
} as const;
