import type { Metadata } from 'next';
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
import { LogoSplash } from '@/components/logo-splash';
import { WorkspaceChatWrapper } from '@/components/workspace-chat-wrapper';
import { AdminProvider } from '@/components/admin-provider';
import { HeaderActions } from '@/components/header-actions';
import { AIChatWidget } from '@/components/ai-chat-widget';

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
        {[...Array(4)].map((_, i) => (
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
        className={`${GeistSans.variable} ${GeistMono.variable} flex h-screen overflow-hidden bg-background text-foreground antialiased`}
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
                    <header className="flex h-12 items-center justify-end gap-2 border-b border-border bg-card px-4">
                      <HeaderActions />
                    </header>
                    <main className="flex-1 overflow-y-auto">{children}</main>
                  </div>
                  <WorkspaceChatWrapper />
                  <AIChatWidget />
                </SidebarProvider>
              </WorkspaceProvider>
            </AdminProvider>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
