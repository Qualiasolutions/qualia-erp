import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Sidebar } from '@/components/sidebar';
import { CommandMenu } from '@/components/command-menu';
import { ThemeProvider } from '@/components/theme-provider';
import { WorkspaceProvider } from '@/components/workspace-provider';
import { SidebarProvider } from '@/components/sidebar-provider';
import { SWRProvider } from '@/components/swr-provider';
import { LogoSplash } from '@/components/logo-splash';
import { WorkspaceChatWrapper } from '@/components/workspace-chat-wrapper';
import { AdminProvider } from '@/components/admin-provider';
import { HeaderActions } from '@/components/header-actions';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.qualiasolutions.io';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fefefe' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0b' },
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
    icon: '/logo.webp',
    shortcut: '/logo.webp',
    apple: '/logo.webp',
  },
  manifest: '/manifest.webmanifest',
  robots: {
    index: true,
    follow: true,
  },
  category: 'technology',
};

function SidebarSkeleton() {
  return (
    <div className="hidden h-full w-16 flex-shrink-0 flex-col border-r border-border/50 bg-background/80 backdrop-blur-xl md:flex">
      <div className="flex h-16 items-center justify-center border-b border-border/50">
        <div className="h-7 w-7 animate-pulse rounded-lg bg-muted" />
      </div>
      <nav className="flex flex-1 flex-col items-center gap-1 py-4">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
        <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
        <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
        <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
        <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
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
        className={`${GeistSans.variable} flex h-screen overflow-hidden bg-background text-foreground antialiased`}
      >
        <ThemeProvider>
          <SWRProvider>
            <AdminProvider>
              <LogoSplash />
              <WorkspaceProvider>
                <SidebarProvider>
                  <Suspense fallback={null}>
                    <CommandMenu />
                  </Suspense>
                  <Suspense fallback={<SidebarSkeleton />}>
                    <Sidebar />
                  </Suspense>
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <header className="flex h-14 items-center justify-between gap-2 border-b border-border/60 bg-card/80 px-3 shadow-sm backdrop-blur-sm sm:justify-end sm:px-4">
                      <HeaderActions />
                    </header>
                    <main className="flex-1 overflow-y-auto">{children}</main>
                  </div>
                  <WorkspaceChatWrapper />
                </SidebarProvider>
              </WorkspaceProvider>
            </AdminProvider>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
