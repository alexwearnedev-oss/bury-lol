import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// /api/checkout — 5 requests per IP per hour
export const checkoutRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'rl:checkout',
});

// /api/report — 1 request per IP per grave
export const reportRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, '24 h'),
  prefix: 'rl:report',
});
