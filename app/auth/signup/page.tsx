import { getInvitationByToken, markInvitationOpened } from '@/app/actions/client-invitations';
import { SignupForm } from '@/components/auth/signup-form';
import Image from 'next/image';
import { FileText, MessageSquare, Shield } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = params.token;

  // If no token, show error
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-foreground">Invalid Invitation Link</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            The invitation link is missing or invalid. Please check your email for the correct link.
          </p>
          <Link
            href="/auth/login"
            className="mt-6 inline-block text-sm text-qualia-600 hover:text-qualia-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Validate invitation token
  const invitationResult = await getInvitationByToken(token);

  if (invitationResult.error || !invitationResult.invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-foreground">Invalid Invitation</h1>
          <p className="mt-4 text-sm text-destructive">{invitationResult.error}</p>
          <Link
            href="/auth/login"
            className="mt-6 inline-block text-sm text-qualia-600 hover:text-qualia-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const invitation = invitationResult.invitation;

  // Mark invitation as opened (non-blocking) — pass token, not UUID PK
  await markInvitationOpened(token);

  return (
    <div className="flex min-h-screen w-full">
      {/* Left Panel — Brand with animated gradient */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-qualia-950 p-12 lg:flex lg:w-[45%] xl:w-[42%]">
        {/* Animated gradient background */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(0,164,172,0.15) 0%, rgba(0,140,147,0.08) 25%, transparent 50%, rgba(0,164,172,0.12) 75%, rgba(0,111,117,0.1) 100%)',
            backgroundSize: '400% 400%',
            animation: 'gradientShift 15s ease infinite',
          }}
        />
        {/* Subtle radial glows */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-qualia-500/10 blur-[140px]" />
        <div className="bg-qualia-600/8 pointer-events-none absolute -right-20 bottom-0 h-[400px] w-[400px] rounded-full blur-[120px]" />

        {/* Top — Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <Image src="/logo.webp" alt="Qualia" width={40} height={40} className="rounded-lg" />
            <span className="text-lg font-semibold tracking-tight text-white">Qualia</span>
          </div>
        </div>

        {/* Center — Headline + Feature bullets */}
        <div className="relative z-10 max-w-md">
          <h1 className="text-[3.25rem] font-bold leading-[1.06] tracking-[-0.04em] text-white">
            Welcome to <span className="text-qualia-400">Qualia.</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-qualia-200/60">
            Your client portal for real-time project updates, direct communication, and secure
            collaboration.
          </p>

          {/* Feature highlights */}
          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-qualia-500/15">
                <FileText className="h-4 w-4 text-qualia-400" />
              </div>
              <span className="text-sm text-qualia-200/70">Real-time project updates</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-qualia-500/15">
                <MessageSquare className="h-4 w-4 text-qualia-400" />
              </div>
              <span className="text-sm text-qualia-200/70">Direct communication with team</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-qualia-500/15">
                <Shield className="h-4 w-4 text-qualia-400" />
              </div>
              <span className="text-sm text-qualia-200/70">Secure file sharing</span>
            </div>
          </div>
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
            <h2 className="text-[2rem] font-bold tracking-[-0.03em] text-foreground">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Join your team on the Qualia platform
            </p>
          </div>

          <SignupForm
            invitation={{
              email: invitation.email,
              projectName: invitation.project_name,
              welcomeMessage: invitation.welcome_message,
              invitationToken: token,
            }}
          />

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-muted-foreground/60">
            Protected by enterprise-grade security
          </p>
        </div>
      </div>
    </div>
  );
}
