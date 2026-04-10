import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-token';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin/* routes (but not /admin/login itself)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value ?? '';
    const valid = token ? await verifyAdminToken(token, process.env.ADMIN_PASSWORD ?? '') : false;
    if (!valid) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Protect /api/approve — admin only
  if (pathname.startsWith('/api/approve')) {
    const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value ?? '';
    const valid = token ? await verifyAdminToken(token, process.env.ADMIN_PASSWORD ?? '') : false;
    if (!valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/approve'],
};
