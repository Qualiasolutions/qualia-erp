'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActionState, useEffect, useState } from 'react';
import { Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { loginAction } from '@/app/actions';

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [state, formAction, isPending] = useActionState(loginAction, {
    success: false,
    error: null,
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (state.success) {
      window.location.href = '/';
    }
  }, [state.success]);

  return (
    <div className={cn('flex flex-col', className)} {...props}>
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
            placeholder="you@company.com"
            required
            autoComplete="email"
            autoFocus
            className="h-12"
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </Label>
            <button
              type="button"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              tabIndex={-1}
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              className="h-12 pr-11"
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
              Sign in
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-xs text-muted-foreground/50">or</span>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      {/* Keyboard shortcut hint */}
      <p className="text-center text-xs text-muted-foreground/40">
        Press{' '}
        <kbd className="rounded border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">
          Enter
        </kbd>{' '}
        to sign in
      </p>
    </div>
  );
}
