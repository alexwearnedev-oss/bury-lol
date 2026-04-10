// HMAC-SHA256 signed session tokens for admin auth.
// Token format: `${expiry_epoch_ms}:${hex_hmac_signature}`
// The ADMIN_PASSWORD is used as the signing key — rotating it invalidates all sessions.
// Uses Web Crypto (crypto.subtle) so this module is safe in both Edge (middleware) and Node runtimes.

export const ADMIN_SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const ADMIN_TOKEN_COOKIE = 'admin_token';

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length % 2 !== 0) return null;
  const buffer = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (isNaN(byte)) return null;
    bytes[i / 2] = byte;
  }
  return bytes;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function createAdminToken(secret: string): Promise<string> {
  const expiry = Date.now() + ADMIN_SESSION_DURATION_MS;
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(String(expiry)),
  );
  const hex = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${expiry}:${hex}`;
}

export async function verifyAdminToken(token: string, secret: string): Promise<boolean> {
  if (!secret) return false; // guard: unset ADMIN_PASSWORD must never validate

  const colonIdx = token.indexOf(':');
  if (colonIdx === -1) return false;

  const expiryStr = token.slice(0, colonIdx);
  const hex = token.slice(colonIdx + 1);

  const expiry = parseInt(expiryStr, 10);
  if (isNaN(expiry) || expiry < Date.now()) return false;

  const sigBytes = hexToBytes(hex);
  if (!sigBytes || sigBytes.length !== 32) return false; // SHA-256 = 32 bytes

  try {
    const key = await importKey(secret);
    return await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(expiryStr),
    );
  } catch {
    return false;
  }
}
