import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { CommandMenu } from "@/components/command-menu";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Qualia Internal Suite",
  description: "Project Planning & Management",
};

function SidebarSkeleton() {
  return (
    <div className="flex flex-col h-screen w-64 bg-[#1C1C1C] border-r border-[#2C2C2C]">
      <div className="p-4 border-b border-[#2C2C2C]">
        <div className="h-6 w-32 bg-[#2C2C2C] rounded animate-pulse" />
      </div>
      <div className="p-3">
        <div className="h-8 bg-[#2C2C2C] rounded animate-pulse" />
      </div>
      <nav className="flex-1 px-2 py-2 space-y-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 bg-[#2C2C2C] rounded animate-pulse" />
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
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#141414] text-[#EDEDED] antialiased flex h-screen overflow-hidden`}>
        <Suspense fallback={null}>
          <CommandMenu />
        </Suspense>
        <Suspense fallback={<SidebarSkeleton />}>
          <Sidebar />
        </Suspense>
        <main className="flex-1 overflow-y-auto bg-[#141414]">
          {children}
        </main>
      </body>
    </html>
  );
}
