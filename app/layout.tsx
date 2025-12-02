import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { CommandMenu } from "@/components/command-menu";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { SidebarProvider } from "@/components/sidebar-provider";
import { LogoSplash } from "@/components/logo-splash";

// Optimized font loading with next/font
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Qualia Solutions Internal Suite",
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
      <body className={`${inter.variable} ${dmSans.variable} ${jetbrainsMono.variable} bg-background text-foreground antialiased flex h-screen overflow-hidden`}>
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
