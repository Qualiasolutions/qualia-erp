'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActionState, useEffect } from 'react';
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import { loginAction } from '@/app/actions';

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  // React 19: Single state for form handling with useActionState
  const [state, formAction, isPending] = useActionState(loginAction, {
    success: false,
    error: null,
  });

  // Handle successful login redirect
  useEffect(() => {
    if (state.success) {
      // Use window.location for a full page reload to ensure server state is refreshed
      window.location.href = '/';
    }
  }, [state.success]);

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="p-8">
          <form action={formAction} className="space-y-6">
            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@company.com"
                  required
                  className="glass h-12 rounded-xl border-white/10 bg-white/[0.02] pl-11 transition-all focus:border-qualia-500/50 focus:ring-qualia-500/20"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <button
                  type="button"
                  className="text-xs text-qualia-400 transition-colors hover:text-qualia-300"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="glass h-12 rounded-xl border-white/10 bg-white/[0.02] pl-11 transition-all focus:border-qualia-500/50 focus:ring-qualia-500/20"
                />
              </div>
            </div>

            {/* Error message */}
            {state.error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                <p className="text-sm text-red-400">{state.error}</p>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              className="group h-12 w-full rounded-xl bg-gradient-to-r from-qualia-500 to-qualia-600 font-semibold text-black transition-all duration-300 hover:from-qualia-400 hover:to-qualia-500 hover:shadow-glow"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Divider */}
        <div className="px-8">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Footer */}
        <div className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Protected by enterprise-grade security</p>
        </div>
      </div>
    </div>
  );
}
