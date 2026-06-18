import type { NextConfig } from "next";

// Content-Security-Policy tuned for this app: same-origin by default, with the
// allowances Leaflet needs (OpenStreetMap tiles, marker images). 'unsafe-inline'
// is required for Next.js's hydration/bootstrap scripts and Tailwind styles.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://unpkg.com",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://*.tile.openstreetmap.org",
  "font-src 'self' data:"
].join('; ')

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Allow geolocation for the supplier portal's GPS capture (same-origin only).
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }
        ]
      }
    ]
  }
};

export default nextConfig;
