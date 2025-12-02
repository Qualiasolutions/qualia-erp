import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Inter, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/sidebar';
import { CommandMenu } from '@/components/command-menu';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { WorkspaceProvider } from '@/components/workspace-provider';
import { SidebarProvider } from '@/components/sidebar-provider';
import { LogoSplash } from '@/components/logo-splash';
import { WorkspaceChatWrapper } from '@/components/workspace-chat-wrapper';

// Optimized font loading with next/font
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Qualia Solutions Internal Suite',
  description: 'Project Planning & Management',
};

function SidebarSkeleton() {
  return (
    <div className="flex h-screen w-60 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-4">
        <div className="h-7 w-7 animate-pulse rounded-lg bg-muted" />
        <div className="ml-2.5 space-y-1.5">
          <div className="h-3.5 w-16 animate-pulse rounded bg-muted" />
          <div className="h-2.5 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="border-b border-border p-3">
        <div className="h-9 animate-pulse rounded-lg bg-muted" />
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-lg bg-muted" />
        ))}
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
      <body
        className={`${inter.variable} ${dmSans.variable} ${jetbrainsMono.variable} flex h-screen overflow-hidden bg-background text-foreground antialiased`}
      >
        <ThemeProvider>
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
                <header className="flex h-12 items-center justify-end border-b border-border bg-card px-4">
                  <ThemeSwitcher />
                </header>
                <main className="flex-1 overflow-y-auto">{children}</main>
              </div>
              <WorkspaceChatWrapper />
            </SidebarProvider>
          </WorkspaceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
