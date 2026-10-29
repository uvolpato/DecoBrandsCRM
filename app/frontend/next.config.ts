import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  // Le intestazioni di sicurezza delle pagine; /api le mette Helmet nel backend.
  async headers() {
    return [
      {
        source: '/((?!api/).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },
  // Il browser parla solo con il frontend: /api/* va al backend, così sessione e CSRF
  // restano sulla stessa origine (§3.3).
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${process.env.BACKEND_URL ?? 'http://127.0.0.1:8002'}/api/:path*` }];
  },
};

export default config;
