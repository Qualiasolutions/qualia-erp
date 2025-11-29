import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { CommandMenu } from "@/components/command-menu";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Qualia",
  description: "Project Planning & Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#141414] text-[#EDEDED] antialiased flex h-screen overflow-hidden`}>
        <CommandMenu />
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#141414]">
          {children}
        </main>
      </body>
    </html>
  );
}
