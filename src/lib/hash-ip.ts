import { createHash } from 'crypto';

export function hashIP(ip: string | null): string {
  const raw = ip ?? 'unknown';
  return createHash('sha256')
    .update(raw + process.env.IP_HASH_SALT)
    .digest('hex')
    .slice(0, 16);
}
