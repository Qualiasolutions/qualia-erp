import type { Metadata } from 'next';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: {
    default: 'Capability audit | Qualia',
    template: '%s | Qualia',
  },
  robots: { index: false, follow: false },
};

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh w-full flex-1 overflow-y-auto bg-background text-foreground">
      <Toaster richColors position="top-center" />
      {children}
    </div>
  );
}
