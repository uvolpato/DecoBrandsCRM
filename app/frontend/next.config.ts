import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  // niente pallino di Next in sviluppo: copre il piede delle finestre a tutto schermo
  devIndicators: false,
  // Il PDF passa da LibreOffice e su alcune macchine impiega ~1 minuto: il proxy di Next non
  // deve chiudere la richiesta prima (F4-A3, §11).
  experimental: { proxyTimeout: 180_000 },
  // Le intestazioni di sicurezza delle pagine; /api le mette Helmet nel backend.
  // `unsafe-eval` solo in sviluppo: lo usano Next e le prove Playwright; in esercizio resta fuori.
  async headers() {
    const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'" +
      (process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'") +
      "; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'";
    const intestazioni: { key: string; value: string }[] = [
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Content-Security-Policy', value: csp },
    ];
    // HSTS solo in esercizio: in sviluppo il browser non deve ricordare localhost (D-41, §3.4)
    if (process.env.NODE_ENV === 'production')
      intestazioni.push({ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' });
    return [{ source: '/((?!api/).*)', headers: intestazioni }];
  },
  // Il browser parla solo con il frontend: /api/* va al backend, così sessione e CSRF
  // restano sulla stessa origine (§3.3).
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${process.env.BACKEND_URL ?? 'http://127.0.0.1:8002'}/api/:path*` }];
  },
};

export default config;
