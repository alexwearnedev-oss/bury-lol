import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin/* routes (but not /admin/login itself)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const adminToken = request.cookies.get('admin_token')?.value;
    if (adminToken !== process.env.ADMIN_PASSWORD) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Protect /api/approve — admin only
  if (pathname.startsWith('/api/approve')) {
    const adminToken = request.cookies.get('admin_token')?.value;
    if (adminToken !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/approve'],
};
