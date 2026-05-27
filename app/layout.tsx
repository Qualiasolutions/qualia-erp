import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { CommandMenu } from '@/components/command-menu';
import { ThemeProvider } from '@/components/theme-provider';
import { DensityProvider } from '@/components/density-provider';
import { WorkspaceProvider } from '@/components/workspace-provider';
import { SidebarProvider } from '@/components/sidebar-provider';
import { SWRProvider } from '@/components/swr-provider';
import { AdminProvider } from '@/components/admin-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import dynamic from 'next/dynamic';
import { AIAssistantProvider } from '@/components/ai-assistant';

const AIAssistantWidget = dynamic(() =>
  import('@/components/ai-assistant').then((m) => ({
    default: m.AIAssistantWidget,
  }))
);
import { SessionGuard } from '@/components/session-guard';
import { PlannedLogoutBanner } from '@/components/planned-logout-banner';
import { AccessibilityAnnouncer } from '@/components/accessibility-announcer';
import { LazyMotionProvider } from '@/lib/lazy-motion';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://portal.qualiasolutions.net';
const enableVercelInsights = Boolean(process.env.VERCEL_URL);

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EDF0F0' },
    { media: '(prefers-color-scheme: dark)', color: '#121819' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: {
    default: 'Qualia Suite',
    template: '%s | Qualia',
  },
  description:
    'Projects, clients, finance, and AI — one workspace. The internal platform that runs Qualia Solutions.',
  keywords: [
    'project management',
    'task management',
    'team collaboration',
    'AI assistant',
    'Qualia Solutions',
  ],
  authors: [{ name: 'Qualia Solutions', url: 'https://qualiasolutions.net' }],
  creator: 'Qualia Solutions',
  publisher: 'Qualia Solutions',
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Qualia Suite',
    title: 'Qualia Suite — Projects · Clients · Finance · AI',
    description:
      'Projects, clients, finance, and AI — one workspace. The internal platform that runs Qualia Solutions.',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Qualia Suite — Projects · Clients · Finance · AI · one workspace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Qualia Suite — Projects · Clients · Finance · AI',
    description:
      'Projects, clients, finance, and AI — one workspace. The internal platform that runs Qualia Solutions.',
    images: ['/twitter-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
  },
  category: 'technology',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Supabase origin hint — fonts are self-hosted via next/font (Geist) */}
        <link rel="dns-prefetch" href="https://vbpzaiqovffpsroxaulv.supabase.co" />
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} flex h-screen overflow-hidden bg-background text-foreground antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:shadow-elevation-2"
        >
          Skip to content
        </a>
        <LazyMotionProvider>
          <ThemeProvider>
            <DensityProvider>
              <SWRProvider>
                <AccessibilityAnnouncer>
                  <AuthProvider>
                    <AdminProvider>
                      <WorkspaceProvider>
                        <SidebarProvider>
                          <AIAssistantProvider>
                            <Suspense fallback={null}>
                              <CommandMenu />
                            </Suspense>
                            <Suspense fallback={null}>
                              <AIAssistantWidget />
                            </Suspense>
                            <Suspense fallback={null}>
                              <SessionGuard />
                            </Suspense>
                            <Suspense fallback={null}>
                              <PlannedLogoutBanner />
                            </Suspense>
                            {children}
                          </AIAssistantProvider>
                        </SidebarProvider>
                      </WorkspaceProvider>
                    </AdminProvider>
                  </AuthProvider>
                </AccessibilityAnnouncer>
              </SWRProvider>
            </DensityProvider>
          </ThemeProvider>
        </LazyMotionProvider>
        <Toaster position="top-center" richColors closeButton />
        {enableVercelInsights ? (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        ) : null}
      </body>
    </html>
  );
}
