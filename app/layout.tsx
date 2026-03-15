import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Sidebar } from '@/components/sidebar';
import { CommandMenu } from '@/components/command-menu';
import { ThemeProvider } from '@/components/theme-provider';
import { WorkspaceProvider } from '@/components/workspace-provider';
import { SidebarProvider } from '@/components/sidebar-provider';
import { SWRProvider } from '@/components/swr-provider';
import { AdminProvider } from '@/components/admin-provider';
import { AIAssistantProvider, AIAssistantWidget } from '@/components/ai-assistant';
import { AccessibilityAnnouncer } from '@/components/accessibility-announcer';
import { PageTransition } from '@/components/page-transition';
import { Toaster } from 'sonner';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.qualiasolutions.io';

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
    default: 'Qualia Internal Suite',
    template: '%s | Qualia',
  },
  description:
    'Project Planning & Management platform by Qualia Solutions. Streamline your workflow with AI-powered project management.',
  keywords: [
    'project management',
    'task management',
    'team collaboration',
    'AI assistant',
    'Qualia Solutions',
  ],
  authors: [{ name: 'Qualia Solutions', url: 'https://qualiasolutions.io' }],
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
    siteName: 'Qualia Internal Suite',
    title: 'Qualia Internal Suite',
    description: 'Project Planning & Management platform by Qualia Solutions',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Qualia Internal Suite',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Qualia Internal Suite',
    description: 'Project Planning & Management platform by Qualia Solutions',
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

function SidebarSkeleton() {
  return (
    <div className="hidden h-full w-56 flex-shrink-0 flex-col border-r border-border/40 bg-card md:flex">
      <div className="flex h-[60px] items-center gap-2.5 border-b border-border/20 px-4">
        <div className="h-7 w-7 animate-pulse rounded-lg bg-muted" />
        <div className="h-3 w-14 animate-pulse rounded bg-muted" />
      </div>
      <div className="px-3 pt-4">
        <div className="mb-2 h-3 w-16 animate-pulse rounded bg-muted/30" />
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted/50" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted/50" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted/50" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted/50" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted/50" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted/50" />
      </nav>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect hints for faster resource loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://dhnlvbjxmmsxetxphqbh.supabase.co" />
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} flex h-screen overflow-hidden bg-background text-foreground antialiased`}
      >
        {/* Skip to main content link for keyboard users */}
        <a href="#main-content" className="skip-to-main">
          Skip to main content
        </a>
        <ThemeProvider>
          <SWRProvider>
            <AccessibilityAnnouncer>
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
                      <Suspense fallback={<SidebarSkeleton />}>
                        <Sidebar />
                      </Suspense>
                      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <main
                          id="main-content"
                          className="min-h-0 flex-1 overflow-y-auto"
                          tabIndex={-1}
                        >
                          <PageTransition>{children}</PageTransition>
                        </main>
                      </div>
                    </AIAssistantProvider>
                  </SidebarProvider>
                </WorkspaceProvider>
              </AdminProvider>
            </AccessibilityAnnouncer>
          </SWRProvider>
        </ThemeProvider>
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
