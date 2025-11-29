import { LoginForm } from "@/components/login-form";
import Image from "next/image";

export default function Page() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center p-6 md:p-10 overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-br from-qualia-500/10 via-transparent to-neon-purple/10 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-qualia-500/20 rounded-full blur-[150px] -translate-y-1/2 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Logo and branding */}
        <div className="text-center mb-8 space-y-4">
          <div className="relative inline-block">
            <Image
              src="/logo.webp"
              alt="Qualia"
              width={64}
              height={64}
              className="rounded-2xl mx-auto"
            />
            <div className="absolute -inset-2 bg-qualia-500/30 blur-xl rounded-2xl -z-10 animate-pulse-glow" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Welcome to <span className="text-qualia-400">Qualia</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to access your workspace
            </p>
          </div>
        </div>

        <LoginForm />

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="text-qualia-400 font-medium">Qualia Solutions</span>
          </p>
        </div>
      </div>
    </div>
  );
}
