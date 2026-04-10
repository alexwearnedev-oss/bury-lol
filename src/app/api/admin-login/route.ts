import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminToken, ADMIN_SESSION_DURATION_MS, ADMIN_TOKEN_COOKIE } from '@/lib/admin-token';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { password } = body as Record<string, unknown>;

  const adminPassword = process.env.ADMIN_PASSWORD ?? '';
  const passwordMatch =
    typeof password === 'string' &&
    adminPassword.length > 0 &&
    password.length === adminPassword.length &&
    timingSafeEqual(Buffer.from(password), Buffer.from(adminPassword));

  if (!passwordMatch) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = await createAdminToken(process.env.ADMIN_PASSWORD!);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ADMIN_SESSION_DURATION_MS / 1000, // cookie maxAge is in seconds
    path: '/',
  });

  return response;
}
