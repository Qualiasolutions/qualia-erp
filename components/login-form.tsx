'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActionState, useEffect, useState } from 'react';
import { Loader2, Eye, EyeOff, ArrowRight, Users, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { loginAction } from '@/app/actions/auth';

type LoginMode = 'team' | 'client';

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [state, formAction, isPending] = useActionState(loginAction, {
    success: false,
    error: null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<LoginMode | null>(null);

  useEffect(() => {
    if (state.success) {
      // Middleware handles role-based routing, but use the right entry point
      window.location.href = mode === 'client' ? '/' : '/';
    }
  }, [state.success, mode]);

  if (!mode) {
    return (
      <div className={cn('flex flex-col gap-3', className)} {...props}>
        <PortalCard
          title="Team"
          description="Admin & employee access"
          icon={<Users className="h-5 w-5" />}
          onClick={() => setMode('team')}
        />
        <PortalCard
          title="Portal"
          description="Track projects & manage your account"
          icon={<Briefcase className="h-5 w-5" />}
          onClick={() => setMode('client')}
        />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)} {...props}>
      {/* Back to role selection */}
      <button
        type="button"
        onClick={() => setMode(null)}
        className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowRight className="h-3 w-3 rotate-180" />
        Back
      </button>

      <form action={formAction} className="space-y-5">
        {/* Email or Username */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            {mode === 'client' ? 'Username or email' : 'Email'}
          </Label>
          <Input
            id="email"
            name="email"
            type="text"
            inputMode={mode === 'client' ? 'text' : 'email'}
            placeholder={mode === 'client' ? 'yourname' : 'you@company.com'}
            required
            autoComplete="username"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="h-12 focus-visible:border-primary/50 focus-visible:ring-primary/30"
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </Label>
            <Link
              href="/auth/reset-password"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              tabIndex={-1}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              className="h-12 pr-11 focus-visible:border-primary/50 focus-visible:ring-primary/30"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors hover:text-foreground"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Error */}
        {state.error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
            <p className="text-sm text-destructive">{state.error}</p>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          size="lg"
          className="group h-12 w-full text-sm font-semibold"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              {mode === 'client' ? 'Sign in to Portal' : 'Sign in'}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

function PortalCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="group relative block w-full text-left">
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border px-5 py-4 transition-all duration-300 ease-out',
          'border-border bg-foreground/[0.02] hover:border-primary/50 hover:bg-primary/[0.04]'
        )}
      >
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-lg transition-all duration-300',
                'bg-foreground/[0.05] text-muted-foreground/60 group-hover:bg-primary/20 group-hover:text-primary'
              )}
            >
              {icon}
            </div>
            <div>
              <h3 className="font-medium text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground/50">{description}</p>
            </div>
          </div>
          <ArrowRight
            className={cn(
              'h-5 w-5 transition-all duration-300 ease-out',
              'text-muted-foreground/20 group-hover:translate-x-1 group-hover:text-primary'
            )}
          />
        </div>
      </div>
    </button>
  );
}
