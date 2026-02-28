import { LoginForm } from '@/components/login-form';
import Image from 'next/image';

export default function Page() {
  return (
    <div className="flex min-h-screen w-full">
      {/* Left Panel — Brand */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-qualia-950 p-12 lg:flex lg:w-[45%] xl:w-[42%]">
        {/* Subtle radial glow */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-qualia-500/10 blur-[140px]" />
        <div className="bg-qualia-600/8 pointer-events-none absolute -right-20 bottom-0 h-[400px] w-[400px] rounded-full blur-[120px]" />

        {/* Top — Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <Image src="/logo.webp" alt="Qualia" width={40} height={40} className="rounded-lg" />
            <span className="text-lg font-semibold tracking-tight text-white">Qualia</span>
          </div>
        </div>

        {/* Center — Headline */}
        <div className="relative z-10 max-w-md">
          <h1 className="text-[2.75rem] font-bold leading-[1.08] tracking-[-0.04em] text-white">
            Build better, <span className="text-qualia-400">ship faster.</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-qualia-200/60">
            Your workspace for managing projects, clients, and teams — all in one place.
          </p>
        </div>

        {/* Bottom — Client logos grid */}
        <div className="relative z-10 space-y-5">
          <p className="text-xs font-medium uppercase tracking-widest text-qualia-300/40">
            Trusted by
          </p>
          <div className="flex items-center gap-6 opacity-40 grayscale">
            <Image
              src="/logos/alkemy.png"
              alt="Alkemy"
              width={80}
              height={24}
              className="h-5 w-auto brightness-200"
            />
            <Image
              src="/logos/innrvo.png"
              alt="Innrvo"
              width={80}
              height={24}
              className="h-5 w-auto brightness-200"
            />
            <Image
              src="/logos/aquador.png"
              alt="Aquador"
              width={80}
              height={24}
              className="h-5 w-auto brightness-200"
            />
            <Image
              src="/logos/armenius.png"
              alt="Armenius"
              width={80}
              height={24}
              className="h-5 w-auto brightness-200"
            />
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="relative flex flex-1 items-center justify-center bg-background px-6 py-12 sm:px-12">
        {/* Subtle top-right glow on dark */}
        <div className="pointer-events-none absolute right-0 top-0 h-[300px] w-[300px] rounded-full bg-qualia-500/[0.03] blur-[80px] dark:bg-qualia-500/[0.06]" />

        <div className="relative z-10 w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <Image src="/logo.webp" alt="Qualia" width={36} height={36} className="rounded-lg" />
            <span className="text-lg font-semibold tracking-tight text-foreground">Qualia</span>
          </div>

          {/* Header */}
          <div className="mb-10">
            <h2 className="text-[1.75rem] font-bold tracking-[-0.03em] text-foreground">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">Sign in to your workspace</p>
          </div>

          <LoginForm />

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-muted-foreground/60">
            Protected by enterprise-grade security
          </p>
        </div>
      </div>
    </div>
  );
}
