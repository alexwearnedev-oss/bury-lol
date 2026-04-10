// Signed, short-lived tokens that carry success-page display data through
// the Stripe redirect URL. Created at checkout so /success needs no Supabase query.
//
// Format: base64url(JSON payload) + "." + HMAC-SHA256 hex
// Signing key: STRIPE_SECRET_KEY (server-only, already in env).
// Expires: 24 hours — long enough for the user to return via browser history.

export interface SuccessPayload {
  subject: string;
  epitaph: string | null;
  buried_by: string;
  tier: 1 | 2 | 3 | 4;
  amount_paid: number; // in cents — deterministic from tier config at checkout
  icon: string | null;
  share_token: string; // pre-generated at checkout, stored in Stripe metadata
}

const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

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

export async function createSuccessToken(
  payload: SuccessPayload,
  secret: string,
): Promise<string> {
  const body = JSON.stringify({ ...payload, exp: Date.now() + EXPIRY_MS });
  const encoded = Buffer.from(body).toString('base64url');
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded));
  return `${encoded}.${toHex(sig)}`;
}

export async function parseSuccessToken(
  token: string,
  secret: string,
): Promise<SuccessPayload | null> {
  if (!secret) return null;
  const dotIdx = token.lastIndexOf('.');
  if (dotIdx === -1) return null;

  const encoded = token.slice(0, dotIdx);
  const hex = token.slice(dotIdx + 1);

  const sigBytes = hexToBytes(hex);
  if (!sigBytes || sigBytes.length !== 32) return null; // SHA-256 = 32 bytes

  try {
    const key = await importKey(secret);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(encoded),
    );
    if (!valid) return null;

    const data = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf-8'),
    ) as Record<string, unknown>;

    if (typeof data.exp !== 'number' || data.exp < Date.now()) return null;

    delete data.exp;
    return data as unknown as SuccessPayload;
  } catch {
    return null;
  }
}
