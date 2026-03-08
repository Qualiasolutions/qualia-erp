'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActionState, useEffect, useState } from 'react';
import { Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { signupWithInvitationAction } from '@/app/actions/auth';

interface SignupFormProps {
  invitation: {
    email: string;
    projectName: string;
    welcomeMessage?: string;
    invitationToken: string;
  };
}

export function SignupForm({ invitation }: SignupFormProps) {
  const [state, formAction, isPending] = useActionState(signupWithInvitationAction, {
    success: false,
    error: null,
    projectId: undefined,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // Redirect on success
  useEffect(() => {
    if (state.success && state.projectId) {
      window.location.href = `/portal/${state.projectId}`;
    }
  }, [state.success, state.projectId]);

  // Password validation
  const validatePassword = (value: string) => {
    if (value.length > 0 && value.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  // Confirm password validation
  const validateConfirmPassword = (value: string) => {
    if (value.length > 0 && value !== password) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    validatePassword(value);
    // Re-validate confirm password if it's already filled
    if (confirmPassword) {
      validateConfirmPassword(confirmPassword);
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    validateConfirmPassword(value);
  };

  return (
    <div className="flex flex-col">
      {/* Welcome message */}
      {invitation.welcomeMessage && (
        <div className="mb-6 rounded-lg border border-qualia-200/30 bg-qualia-50/50 p-4 dark:border-qualia-800/30 dark:bg-qualia-950/30">
          <p className="text-sm leading-relaxed text-qualia-900 dark:text-qualia-100">
            {invitation.welcomeMessage}
          </p>
        </div>
      )}

      {/* Project badge */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-qualia-500" />
          <span className="text-xs font-medium text-muted-foreground">
            Creating account for <span className="text-foreground">{invitation.projectName}</span>
          </span>
        </div>
      </div>

      <form action={formAction} className="space-y-5">
        {/* Email (pre-filled, read-only) */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={invitation.email}
            readOnly
            disabled
            className="h-12 cursor-not-allowed bg-muted/50 opacity-75"
          />
          <input type="hidden" name="email" value={invitation.email} />
        </div>

        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
            Full Name
          </Label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="John Doe"
            required
            autoFocus
            className="h-12 focus-visible:border-qualia-500/50 focus-visible:ring-qualia-500/30"
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={password}
              onChange={handlePasswordChange}
              className={cn(
                'h-12 pr-11 focus-visible:border-qualia-500/50 focus-visible:ring-qualia-500/30',
                passwordError && 'border-destructive/50'
              )}
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
          {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
          {!passwordError && <p className="text-xs text-muted-foreground">Minimum 8 characters</p>}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
            Confirm Password
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              className={cn(
                'h-12 pr-11 focus-visible:border-qualia-500/50 focus-visible:ring-qualia-500/30',
                confirmPasswordError && 'border-destructive/50'
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors hover:text-foreground"
              tabIndex={-1}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirmPasswordError && (
            <p className="text-xs text-destructive">{confirmPasswordError}</p>
          )}
        </div>

        {/* Hidden invitation token */}
        <input type="hidden" name="invitationToken" value={invitation.invitationToken} />

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
          className="group h-12 w-full bg-qualia-600 text-sm font-semibold hover:bg-qualia-700"
          disabled={isPending || !!passwordError || !!confirmPasswordError}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              Create Account &amp; Access Project
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
