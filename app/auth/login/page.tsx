import type { Metadata } from 'next';
import { LoginForm } from '@/components/login-form';
import { LoginLeftPanel } from '@/components/login-left-panel';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Qualia Suite — your project portal by Qualia Solutions.',
};

export default function Page() {
  return (
    <div className="flex min-h-screen w-full">
      {/* Left Panel — Animated brand */}
      <LoginLeftPanel />

      {/* Right Panel — Sign In */}
      <div className="flex min-h-screen flex-1 flex-col bg-background">
        {/* Mobile Header */}
        <header className="w-full border-b border-border/10 px-6 py-5 lg:hidden">
          <div className="flex items-center gap-3">
            <Image src="/logo.webp" alt="Qualia" width={32} height={32} className="rounded-lg" />
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground">
              Qualia Suite
            </span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-1 items-center justify-center px-6 py-12 lg:px-12">
          <div className="w-full max-w-sm">
            {/* Welcome Text */}
            <div className="mb-10">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Welcome back
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in to continue to Qualia Suite.
              </p>
            </div>

            <LoginForm />

            {/* Contact Link */}
            <div className="mt-10 text-center">
              <p className="text-sm text-muted-foreground/60">
                Need an account?{' '}
                <a
                  href="https://qualiasolutions.net"
                  className="text-primary transition-colors hover:text-qualia-700 dark:hover:text-qualia-300"
                >
                  Talk to us
                </a>
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-5 lg:px-12">
          <p className="text-center text-xs text-muted-foreground/20 lg:text-left">
            Powered by Qualia Solutions
          </p>
        </footer>
      </div>
    </div>
  );
}
