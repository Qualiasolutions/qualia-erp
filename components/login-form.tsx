'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActionState, useEffect, useState } from 'react';
import { Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { loginAction } from '@/app/actions';

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
      window.location.href = mode === 'client' ? '/portal' : '/';
    }
  }, [state.success, mode]);

  if (!mode) {
    return (
      <div className={cn('flex flex-col gap-4', className)} {...props}>
        <button
          onClick={() => setMode('team')}
          className="group relative flex items-center gap-4 rounded-xl border border-border/60 bg-card p-5 text-left transition-all duration-200 hover:border-primary/40 hover:bg-primary/[0.03]"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <svg
              className="h-5 w-5 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-semibold text-foreground">Team Login</span>
            <p className="mt-0.5 text-xs text-muted-foreground">Admin &amp; employee access</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
        </button>

        <button
          onClick={() => setMode('client')}
          className="group relative flex items-center gap-4 rounded-xl border border-border/60 bg-card p-5 text-left transition-all duration-200 hover:border-primary/40 hover:bg-primary/[0.03]"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-qualia-500/10">
            <svg
              className="h-5 w-5 text-qualia-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-semibold text-foreground">
              Qualia Solutions Client Portal
            </span>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Your project hub, powered by Qualia Solutions
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
        </button>
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
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder={mode === 'client' ? 'your@email.com' : 'you@company.com'}
            required
            autoComplete="email"
            autoFocus
            className="h-12 focus-visible:border-qualia-500/50 focus-visible:ring-qualia-500/30"
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
              className="h-12 pr-11 focus-visible:border-qualia-500/50 focus-visible:ring-qualia-500/30"
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
