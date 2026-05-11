'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActionState, useEffect, useState } from 'react';
import { Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { loginAction } from '@/app/actions/auth';

const REMEMBER_KEY = 'qualia.login.remember';
const EMAIL_KEY = 'qualia.login.email';

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [state, formAction, isPending] = useActionState(loginAction, {
    success: false,
    error: null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [remember, setRemember] = useState(false);

  // Hydrate remembered email on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const remembered = window.localStorage.getItem(REMEMBER_KEY) === '1';
    if (remembered) {
      setRemember(true);
      setEmail(window.localStorage.getItem(EMAIL_KEY) ?? '');
    }
  }, []);

  // Persist (or clear) the remembered email each time the toggle or value changes.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (remember && email) {
      window.localStorage.setItem(REMEMBER_KEY, '1');
      window.localStorage.setItem(EMAIL_KEY, email);
    } else if (!remember) {
      window.localStorage.removeItem(REMEMBER_KEY);
      window.localStorage.removeItem(EMAIL_KEY);
    }
  }, [remember, email]);

  useEffect(() => {
    if (state.success) {
      window.location.href = '/dashboard';
    }
  }, [state.success]);

  return (
    <div className={cn('flex flex-col', className)} {...props}>
      <form action={formAction} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            Email or username
          </Label>
          <Input
            id="email"
            name="email"
            type="text"
            inputMode="email"
            placeholder="you@company.com"
            required
            autoComplete="username"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 focus-visible:border-primary/50 focus-visible:ring-primary/30"
          />
        </div>

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

        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={remember}
            onCheckedChange={(checked) => setRemember(checked === true)}
            className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
          />
          <Label
            htmlFor="remember"
            className="cursor-pointer text-sm font-normal text-muted-foreground"
          >
            Remember my email on this device
          </Label>
        </div>

        {state.error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
            <p className="text-sm text-destructive">{state.error}</p>
          </div>
        )}

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
    </div>
  );
}
