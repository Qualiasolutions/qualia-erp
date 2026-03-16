import { LoginForm } from '@/components/login-form';
import Image from 'next/image';

export default function Page() {
  return (
    <div className="flex min-h-screen w-full">
      {/* Left Panel — Premium brand presence */}
      <div className="relative hidden overflow-hidden bg-qualia-950 lg:flex lg:w-[45%] xl:w-[42%]">
        {/* Subtle radial glow behind logo */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,164,172,0.08)_0%,_transparent_70%)]" />

        {/* Fine grid texture */}
        <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:48px_48px]" />

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-12">
          {/* Logo */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-2xl bg-qualia-500/[0.06] blur-xl" />
            <Image
              src="/logo.webp"
              alt="Qualia Solutions"
              width={80}
              height={80}
              className="relative rounded-xl shadow-2xl shadow-qualia-500/10"
              priority
            />
          </div>

          {/* Brand name */}
          <h1 className="mt-7 text-[22px] font-bold tracking-[0.04em] text-white">
            QUALIA SOLUTIONS
          </h1>

          {/* Decorative line */}
          <div className="mt-5 h-px w-12 bg-gradient-to-r from-transparent via-qualia-500/50 to-transparent" />

          {/* Tagline */}
          <p className="mt-5 max-w-[260px] text-center text-[13px] leading-relaxed text-qualia-200/40">
            AI-powered solutions for businesses that move fast. Websites, agents, and automation.
          </p>

          {/* Bottom trust indicators */}
          <div className="absolute bottom-8 flex items-center gap-6 text-[11px] tracking-wide text-qualia-300/25">
            <span>Nicosia, Cyprus</span>
            <span className="h-3 w-px bg-qualia-300/10" />
            <span>qualiasolutions.net</span>
          </div>
        </div>

        {/* Corner accent — top right */}
        <div className="absolute right-0 top-0 h-32 w-32 bg-gradient-to-bl from-qualia-500/[0.06] to-transparent" />
        {/* Corner accent — bottom left */}
        <div className="absolute bottom-0 left-0 h-32 w-32 bg-gradient-to-tr from-qualia-500/[0.04] to-transparent" />
      </div>

      {/* Right Panel — Form */}
      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12 sm:px-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <Image src="/logo.webp" alt="Qualia" width={36} height={36} className="rounded-lg" />
            <span className="text-lg font-bold tracking-[0.02em] text-foreground">QUALIA</span>
          </div>

          {/* Header */}
          <div className="mb-10">
            <h2 className="text-[2rem] font-bold tracking-[-0.03em] text-foreground">
              Welcome back
            </h2>
            <p className="mt-2 text-[14px] text-muted-foreground">Sign in to your workspace</p>
          </div>

          <LoginForm />

          {/* Footer */}
          <p className="mt-12 text-center text-[11px] text-muted-foreground/30">
            Powered by Qualia Solutions
          </p>
        </div>
      </div>
    </div>
  );
}
