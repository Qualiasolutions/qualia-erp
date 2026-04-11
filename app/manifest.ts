import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Qualia Suite',
    short_name: 'Qualia',
    description: 'Client portal and project management platform by Qualia Solutions',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0b',
    theme_color: '#00A4AC',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/logo.webp',
        sizes: '192x192',
        type: 'image/webp',
        purpose: 'any',
      },
      {
        src: '/logo.webp',
        sizes: '512x512',
        type: 'image/webp',
        purpose: 'maskable',
      },
    ],
  };
}
