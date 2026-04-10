import { NextRequest } from 'next/server';

// x-forwarded-for may be a comma-separated chain of IPs added by each proxy,
// e.g. "203.0.113.5, 70.41.3.18, 150.172.238.178".
// The client IP is always the first entry.
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (!forwarded) return 'unknown';
  return forwarded.split(',')[0].trim() || 'unknown';
}
