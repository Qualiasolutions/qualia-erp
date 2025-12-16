import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.qualiasolutions.io';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/auth/login'],
        disallow: [
          '/api/',
          '/protected/',
          '/projects/',
          '/clients/',
          '/schedule/',
          '/settings/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
