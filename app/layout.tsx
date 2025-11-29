import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { CommandMenu } from "@/components/command-menu";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { SidebarProvider } from "@/components/sidebar-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Qualia Internal Suite",
  description: "Project Planning & Management",
};

function SidebarSkeleton() {
  return (
    <div className="flex flex-col h-screen w-64 bg-card border-r border-border transition-all duration-300">
      <div className="p-4 border-b border-border">
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
      </div>
      <div className="p-3">
        <div className="h-8 bg-muted rounded animate-pulse" />
      </div>
      <nav className="flex-1 px-3 py-2 space-y-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />
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
      <body className={`${inter.className} bg-background text-foreground antialiased flex h-screen overflow-hidden`}>
        <ThemeProvider>
          <WorkspaceProvider>
            <SidebarProvider>
              <Suspense fallback={null}>
                <CommandMenu />
              </Suspense>
              <Suspense fallback={<SidebarSkeleton />}>
                <Sidebar />
              </Suspense>
              <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
                <header className="flex items-center justify-end px-4 py-2 border-b border-border bg-background">
                  <ThemeSwitcher />
                </header>
                <main className="flex-1 overflow-y-auto bg-background">
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
