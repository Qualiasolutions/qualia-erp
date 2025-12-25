import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import bundleAnalyzer from '@next/bundle-analyzer';

// Bundle analyzer for performance debugging (run with ANALYZE=true npm run build)
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://*.sentry.io https://vercel.live",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.groq.com https://api.vapi.ai wss://*.vapi.ai https://*.vapi.ai https://*.deepgram.com wss://*.deepgram.com https://*.daily.co wss://*.daily.co https://*.sentry.io https://vercel.live wss://vercel.live",
              "media-src 'self' blob: https://*.vapi.ai https://*.daily.co",
              "worker-src 'self' blob:",
              "frame-src 'self' https://vercel.live",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },

  // Experimental features for bundle optimization
  experimental: {
    // Tree-shake unused exports from these packages for smaller bundles
    // Note: Reduced list to prevent build hangs with Next.js 16+ Turbopack
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-icons',
      'framer-motion',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@tanstack/react-virtual',
      'zod',
    ],
    // Enable client trace metadata for better Sentry tracing
    clientTraceMetadata: ['baggage', 'sentry-trace'],
  },

  // Enable production browser source maps for better debugging
  productionBrowserSourceMaps: false, // Disable for smaller bundle

  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

// Sentry configuration (wrapped with bundle analyzer)
export default withBundleAnalyzer(
  withSentryConfig(nextConfig, {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // Upload source maps for better stack traces
    widenClientFileUpload: true,

    // Disable Sentry telemetry
    telemetry: false,
  })
);
