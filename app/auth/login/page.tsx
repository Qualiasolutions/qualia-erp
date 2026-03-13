import { LoginForm } from '@/components/login-form';
import Image from 'next/image';

export default function Page() {
  return (
    <div className="flex min-h-screen w-full">
      {/* Left Panel — Simple brand presence */}
      <div className="relative hidden items-center justify-center bg-qualia-950 lg:flex lg:w-[45%] xl:w-[42%]">
        <div className="flex flex-col items-center gap-5">
          <Image
            src="/logo.webp"
            alt="Qualia Solutions"
            width={72}
            height={72}
            className="rounded-xl"
            priority
          />
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight text-white">Qualia Solutions</h1>
            <p className="mt-1 text-sm text-qualia-300/50">Internal Suite</p>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12 sm:px-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <Image src="/logo.webp" alt="Qualia" width={36} height={36} className="rounded-lg" />
            <span className="text-lg font-semibold tracking-tight text-foreground">Qualia</span>
          </div>

          {/* Header */}
          <div className="mb-10">
            <h2 className="text-[2rem] font-bold tracking-[-0.03em] text-foreground">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">Sign in to your workspace</p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
