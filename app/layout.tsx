import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { CommandMenu } from "@/components/command-menu";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { SidebarProvider } from "@/components/sidebar-provider";

export const metadata: Metadata = {
  title: "Qualia Internal Suite",
  description: "Project Planning & Management",
};

function SidebarSkeleton() {
  return (
    <div className="flex flex-col h-screen w-60 bg-card border-r border-border">
      <div className="h-14 px-4 flex items-center border-b border-border">
        <div className="h-7 w-7 bg-muted rounded-lg animate-pulse" />
        <div className="ml-2.5 space-y-1.5">
          <div className="h-3.5 w-16 bg-muted rounded animate-pulse" />
          <div className="h-2.5 w-20 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="p-3 border-b border-border">
        <div className="h-9 bg-muted rounded-lg animate-pulse" />
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-9 bg-muted rounded-lg animate-pulse" />
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
      <body className="bg-background text-foreground antialiased flex h-screen overflow-hidden">
        <ThemeProvider>
          <WorkspaceProvider>
            <SidebarProvider>
              <Suspense fallback={null}>
                <CommandMenu />
              </Suspense>
              <Suspense fallback={<SidebarSkeleton />}>
                <Sidebar />
              </Suspense>
              <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex items-center justify-end h-12 px-4 border-b border-border bg-card">
                  <ThemeSwitcher />
                </header>
                <main className="flex-1 overflow-y-auto">
                  {children}
                </main>
              </div>
            </SidebarProvider>
          </WorkspaceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
