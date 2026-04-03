/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Dev needs 'unsafe-eval' for webpack source maps + HMR
      isDev
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com"
        : "script-src 'self' 'unsafe-inline' https://js.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "img-src 'self' data: blob:",
      // Dev needs localhost for webpack HMR websocket
      isDev
        ? "connect-src 'self' ws://localhost:* http://localhost:* https://*.supabase.co wss://*.supabase.co https://api.resend.com"
        : "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
    ].join('; '),
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
