import type { NextConfig } from 'next';
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
              // Voice AI: VAPI, ElevenLabs, Telnyx need script/connect access
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://vercel.live https://cdn.vapi.ai https://elevenlabs.io",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https://fonts.gstatic.com",
              // Voice AI: WebSocket connections for real-time voice
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://openrouter.ai https://generativelanguage.googleapis.com https://vercel.live wss://vercel.live https://api.vapi.ai wss://api.vapi.ai https://api.elevenlabs.io https://api.telnyx.com wss://*.telnyx.com",
              // Voice AI: Media streams for audio/video calls
              "media-src 'self' blob: https: mediastream:",
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
    // Server action body size limit (default 1MB is too small for logo/file uploads)
    serverActions: {
      bodySizeLimit: '5mb',
    },
    // Tree-shake unused exports from these packages for smaller bundles
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
  },

  // Enable production browser source maps for better debugging
  productionBrowserSourceMaps: false,

  // Compiler optimizations
  compiler: {
    // Remove console.log/info/debug in production, but preserve console.error and console.warn
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
};

export default withBundleAnalyzer(nextConfig);
