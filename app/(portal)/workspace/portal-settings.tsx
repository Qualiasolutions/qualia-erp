'use client';

import { useCallback, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Check, Copy, Loader2 } from 'lucide-react';
import { usePortalSettings, invalidatePortalSettings } from '@/lib/swr';
import { updatePortalSettings } from '@/app/actions/portal-admin';

interface PortalSettingsProps {
  workspaceId: string;
}

type NotificationDefaults = {
  task_assigned: boolean;
  task_due_soon: boolean;
  project_update: boolean;
  meeting_reminder: boolean;
  client_activity: boolean;
};

type NotificationKey = keyof NotificationDefaults;

const NOTIFICATION_EVENTS: { key: NotificationKey; label: string }[] = [
  { key: 'task_assigned', label: 'Task assigned' },
  { key: 'task_due_soon', label: 'Task due soon' },
  { key: 'project_update', label: 'Project update' },
  { key: 'meeting_reminder', label: 'Meeting reminder' },
  { key: 'client_activity', label: 'Client activity' },
];

const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export function PortalSettings({ workspaceId }: PortalSettingsProps) {
  const { settings, isLoading } = usePortalSettings(workspaceId);

  // Local form state — null means "use value from settings"
  const [require2fa, setRequire2fa] = useState<boolean | null>(null);
  const [sessionHours, setSessionHours] = useState<number | null>(null);
  const [notificationOverrides, setNotificationOverrides] = useState<Partial<NotificationDefaults>>(
    {}
  );
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);

  // Derived display values
  const displayRequire2fa = require2fa ?? settings?.require_2fa_for_clients ?? false;
  const displaySessionHours = sessionHours ?? settings?.session_duration_hours ?? 24;
  const displayCustomDomain = customDomain ?? settings?.custom_domain ?? '';
  const cnameTarget = settings?.cname_target ?? 'cname.vercel-dns.com';
  const domainVerified = settings?.domain_verified ?? false;

  const notificationValues: NotificationDefaults = useMemo(
    () => ({
      task_assigned:
        notificationOverrides.task_assigned ??
        settings?.notification_defaults?.task_assigned ??
        true,
      task_due_soon:
        notificationOverrides.task_due_soon ??
        settings?.notification_defaults?.task_due_soon ??
        true,
      project_update:
        notificationOverrides.project_update ??
        settings?.notification_defaults?.project_update ??
        true,
      meeting_reminder:
        notificationOverrides.meeting_reminder ??
        settings?.notification_defaults?.meeting_reminder ??
        true,
      client_activity:
        notificationOverrides.client_activity ??
        settings?.notification_defaults?.client_activity ??
        true,
    }),
    [notificationOverrides, settings?.notification_defaults]
  );

  const handleCopyCname = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cnameTarget);
      setCopied(true);
      toast.success('CNAME target copied');
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('Failed to copy CNAME:', error);
      toast.error('Failed to copy');
    }
  }, [cnameTarget]);

  const handleSave = useCallback(async () => {
    // Validate custom domain client-side
    const trimmedDomain = displayCustomDomain.trim();
    if (trimmedDomain.length > 0 && !DOMAIN_REGEX.test(trimmedDomain)) {
      setDomainError('Must be a valid domain (e.g. portal.example.com)');
      toast.error('Invalid custom domain');
      return;
    }
    setDomainError(null);
    setSaving(true);

    try {
      const result = await updatePortalSettings(workspaceId, {
        require_2fa_for_clients: displayRequire2fa,
        session_duration_hours: displaySessionHours,
        notification_defaults: notificationValues,
        custom_domain: trimmedDomain.length > 0 ? trimmedDomain : null,
      });

      if (result.success) {
        invalidatePortalSettings(workspaceId);
        toast.success('Portal settings saved');
      } else {
        toast.error(result.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Portal settings save error:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [
    workspaceId,
    displayRequire2fa,
    displaySessionHours,
    displayCustomDomain,
    notificationValues,
  ]);

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Card A — Auth Policies */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Authentication</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Security policies for client portal sign-ins.
            </p>
          </div>

          {/* Require 2FA */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Label htmlFor="require-2fa" className="text-sm font-medium">
                Require 2FA for clients
              </Label>
            </div>
            <Switch
              id="require-2fa"
              checked={displayRequire2fa}
              onCheckedChange={(checked) => setRequire2fa(checked)}
              aria-label="Require 2FA for clients"
            />
          </div>

          {/* Session duration */}
          <div className="space-y-2">
            <Label htmlFor="session-duration" className="text-sm font-medium">
              Session duration (hours)
            </Label>
            <Input
              id="session-duration"
              type="number"
              min={1}
              max={720}
              value={displaySessionHours}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!Number.isNaN(val)) setSessionHours(val);
              }}
              className="max-w-[160px]"
              aria-describedby="session-duration-hint"
            />
            <p id="session-duration-hint" className="text-xs text-muted-foreground">
              Clients are signed out after this many hours of inactivity.
            </p>
          </div>

          <p className="text-xs text-muted-foreground/80">
            These settings will take effect once Supabase Auth MFA is enabled for the project.
          </p>
        </div>
      </section>

      {/* Card B — Notification Defaults */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Client notification defaults</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Which events trigger client emails by default. Individual clients can override these
              in their own notification preferences.
            </p>
          </div>

          <div className="space-y-3">
            {NOTIFICATION_EVENTS.map(({ key, label }) => {
              const inputId = `notification-${key}`;
              return (
                <div key={key} className="flex items-center justify-between gap-4">
                  <Label htmlFor={inputId} className="text-sm font-medium">
                    {label}
                  </Label>
                  <Switch
                    id={inputId}
                    checked={notificationValues[key]}
                    onCheckedChange={(checked) =>
                      setNotificationOverrides((prev) => ({ ...prev, [key]: checked }))
                    }
                    aria-label={label}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Card C — Custom Domain */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Custom domain</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Use a vanity domain for the portal (e.g.{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                portal.yourcompany.com
              </code>
              ). DNS verification is handled on the hosting provider after saving.
            </p>
          </div>

          {/* Domain input */}
          <div className="space-y-2">
            <Label htmlFor="custom-domain" className="text-sm font-medium">
              Domain
            </Label>
            <Input
              id="custom-domain"
              type="text"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="portal.yourcompany.com"
              value={displayCustomDomain}
              onChange={(e) => {
                setCustomDomain(e.target.value);
                if (domainError) setDomainError(null);
              }}
              aria-invalid={domainError ? 'true' : undefined}
              aria-describedby={domainError ? 'custom-domain-error' : undefined}
              className="max-w-md"
            />
            {domainError && (
              <p id="custom-domain-error" className="text-xs text-red-600 dark:text-red-400">
                {domainError}
              </p>
            )}
          </div>

          {/* CNAME target readonly + copy */}
          <div className="space-y-2">
            <Label htmlFor="cname-target" className="text-sm font-medium">
              CNAME target
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="cname-target"
                type="text"
                value={cnameTarget}
                readOnly
                className="max-w-md bg-muted/40 font-mono text-xs"
                aria-label="CNAME target value"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyCname}
                className="shrink-0 cursor-pointer"
                aria-label="Copy CNAME target to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Verification status chip */}
          <div>
            {domainVerified ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                role="status"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Verified
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                role="status"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
                  aria-hidden="true"
                />
                Pending DNS verification
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="cursor-pointer">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save changes'
          )}
        </Button>
      </div>
    </div>
  );
}
