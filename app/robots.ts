import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://portal.qualiasolutions.net';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/auth/login'],
        disallow: ['/api/', '/protected/', '/portal/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
