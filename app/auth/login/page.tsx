import type { Metadata } from 'next';
import { LoginForm } from '@/components/login-form';
import { LoginLeftPanel } from '@/components/login-left-panel';

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
            <div className="glow-primary-sm flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              Q
            </div>
            <span className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground">
              Qualia Suite
            </span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-1 items-center justify-center px-6 py-12 lg:px-12">
          <div className="w-full max-w-sm">
            {/* Q Logo */}
            <div className="mb-8 flex justify-center lg:hidden">
              <div className="glow-primary-sm flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
                Q
              </div>
            </div>

            {/* Card wrapper */}
            <div className="rounded-2xl border border-border bg-card p-8">
              {/* Welcome Text */}
              <div className="mb-8">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Welcome back
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">Sign in to your workspace</p>
              </div>

              <LoginForm />

              {/* Divider */}
              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-border/30" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground/30">
                  or
                </span>
                <div className="h-px flex-1 bg-border/30" />
              </div>

              {/* Contact Link */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground/50">
                  Not a client yet?{' '}
                  <a
                    href="https://qualiasolutions.net"
                    className="text-primary transition-colors hover:text-qualia-700 dark:hover:text-qualia-300"
                  >
                    Get started
                  </a>
                </p>
              </div>
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
