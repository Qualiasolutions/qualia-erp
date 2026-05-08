'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Loader2, User, Bell, Save, Lock, Plug, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { updateClientProfile, updateNotificationPreferences } from '@/app/actions/client-portal';
import { changePassword } from './_actions';

interface ProfileFormData {
  full_name: string;
  email: string;
  company: string;
}

interface NotificationPreferences {
  task_assigned: boolean;
  task_due_soon: boolean;
  project_update: boolean;
  meeting_reminder: boolean;
  client_activity: boolean;
  delivery_method: 'email' | 'in_app' | 'both';
}

interface SettingsContentProps {
  initialProfile: ProfileFormData;
  initialNotifications: NotificationPreferences;
  userRole?: string;
}

const notificationItems = [
  {
    id: 'task_assigned',
    label: 'Task Assigned',
    description: 'Notify me when a task is assigned to me',
  },
  {
    id: 'task_due_soon',
    label: 'Task Due Soon',
    description: 'Notify me when a task deadline is approaching',
  },
  {
    id: 'project_update',
    label: 'Project Updates',
    description: 'Notify me about important project milestones and updates',
  },
  {
    id: 'meeting_reminder',
    label: 'Meeting Reminders',
    description: 'Notify me before scheduled meetings',
  },
  {
    id: 'client_activity',
    label: 'Activity Updates',
    description: 'Notify me about team activity on my projects',
  },
] as const;

function PasswordChangeSection() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPending, startTransition] = useTransition();

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const formData = new FormData();
    formData.set('newPassword', newPassword);

    startTransition(async () => {
      const result = await changePassword(formData);
      if (result.success) {
        toast.success('Password updated successfully');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(result.error || 'Failed to update password');
      }
    });
  };

  return (
    <section
      className="animate-fade-in rounded-2xl border border-border bg-card p-6 fill-mode-both md:p-7"
      style={{ animationDelay: '100ms' }}
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.08] dark:bg-primary/15">
          <Lock className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
            Change password
          </h2>
          <p className="text-xs text-muted-foreground">Update your account password.</p>
        </div>
      </div>

      <form onSubmit={handlePasswordChange} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="new_password" className="text-sm font-medium">
            New Password
          </Label>
          <Input
            id="new_password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            required
            minLength={8}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm_password" className="text-sm font-medium">
            Confirm New Password
          </Label>
          <Input
            id="confirm_password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            required
            minLength={8}
          />
        </div>

        <div className="pt-1">
          <Button
            type="submit"
            disabled={isPending || !newPassword || !confirmPassword}
            className="min-h-[40px] cursor-pointer rounded-xl bg-primary text-primary-foreground"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Updating…
              </>
            ) : (
              <>
                <Lock className="mr-1.5 h-4 w-4" />
                Update password
              </>
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}

// Clients should only see notifications relevant to their role
const CLIENT_VISIBLE_NOTIFICATIONS = ['task_due_soon', 'project_update'] as const;

export function SettingsContent({
  initialProfile,
  initialNotifications,
  userRole,
}: SettingsContentProps) {
  const [profileData, setProfileData] = useState<ProfileFormData>(initialProfile);
  const [notificationPrefs, setNotificationPrefs] =
    useState<NotificationPreferences>(initialNotifications);
  const [profileSaving, setProfileSaving] = useState(false);
  const [notificationsSaving, setNotificationsSaving] = useState(false);

  const filteredNotificationItems =
    userRole === 'client'
      ? notificationItems.filter((item) =>
          (CLIENT_VISIBLE_NOTIFICATIONS as readonly string[]).includes(item.id)
        )
      : notificationItems;

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);

    try {
      const result = await updateClientProfile({
        full_name: profileData.full_name,
        company: profileData.company || null,
      });

      if (result.success) {
        toast.success('Profile updated successfully');
      } else {
        toast.error(result.error || 'Failed to update profile');
      }
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotificationsSaving(true);

    try {
      const result = await updateNotificationPreferences(notificationPrefs);

      if (result.success) {
        toast.success('Notification preferences updated');
      } else {
        toast.error(result.error || 'Failed to update preferences');
      }
    } catch {
      toast.error('Failed to update preferences');
    } finally {
      setNotificationsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in-up px-[clamp(1.5rem,4vw,2.5rem)] pb-[clamp(2rem,4vw,3rem)] pt-16 md:pt-[clamp(2.5rem,4vw,3.5rem)]">
      <header className="mb-8">
        <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
          <span className="inline-block h-px w-6 bg-primary/60" aria-hidden />
          <span>Account</span>
        </div>
        <h1 className="mt-3 text-[clamp(1.5rem,1rem+1.6vw,2rem)] font-semibold leading-tight tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1.5 max-w-[480px] text-sm text-muted-foreground">
          Profile, password, notifications. Tweak how the portal feels for you.
        </p>
      </header>

      <div className="space-y-6">
        {/* Workspace & admin links — non-clients only */}
        {userRole !== 'client' && (
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/settings/integrations"
              className="group flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-card/70"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.08] dark:bg-primary/15">
                  <Plug className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold tracking-tight text-foreground">
                    Integrations
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    GitHub, Vercel, Zoho — connect external services to projects.
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>

            {userRole === 'admin' && (
              <Link
                href="/admin?tab=system"
                className="group flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-card/70"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.08] dark:bg-primary/15">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold tracking-tight text-foreground">
                      Admin console
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Workspace, team, finance, system health, API tokens.
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            )}
          </section>
        )}

        {/* Profile Settings */}
        <section className="animate-fade-in rounded-2xl border border-border bg-card p-6 fill-mode-both md:p-7">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.08] dark:bg-primary/15">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                Profile information
              </h2>
              <p className="text-xs text-muted-foreground">Update your personal details.</p>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name" className="text-sm font-medium">
                Display Name
              </Label>
              <Input
                id="full_name"
                type="text"
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                placeholder="Your name"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                disabled
                className="bg-muted/50"
                aria-describedby="email-help"
              />
              <p id="email-help" className="text-xs text-muted-foreground">
                Email cannot be changed. Contact support if you need to update it.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="company" className="text-sm font-medium">
                Company
              </Label>
              <Input
                id="company"
                type="text"
                value={profileData.company}
                onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                placeholder="Your company name (optional)"
              />
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                disabled={profileSaving}
                className="min-h-[40px] cursor-pointer rounded-xl bg-primary text-primary-foreground"
              >
                {profileSaving ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="mr-1.5 h-4 w-4" />
                    Save profile
                  </>
                )}
              </Button>
            </div>
          </form>
        </section>

        {/* Password Change */}
        <PasswordChangeSection />

        {/* Notification Preferences */}
        <section
          className="animate-fade-in overflow-hidden rounded-2xl border border-border bg-card fill-mode-both"
          style={{ animationDelay: '150ms' }}
        >
          <div className="p-6 pb-0 md:p-7 md:pb-0">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/[0.1] dark:bg-amber-500/15">
                <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                  Notification preferences
                </h2>
                <p className="text-xs text-muted-foreground">
                  Choose which notifications you receive.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleNotificationSubmit}>
            {/* Notification Toggles */}
            <div className="divide-y divide-border/50 px-1 md:px-2">
              {filteredNotificationItems.map((item) => (
                <div
                  key={item.id}
                  className="flex min-h-[56px] items-center justify-between gap-4 px-5 py-4 md:px-5"
                >
                  <div className="space-y-0.5">
                    <Label htmlFor={item.id} className="cursor-pointer text-sm font-medium">
                      {item.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch
                    id={item.id}
                    checked={notificationPrefs[item.id]}
                    onCheckedChange={(checked) =>
                      setNotificationPrefs({ ...notificationPrefs, [item.id]: checked })
                    }
                  />
                </div>
              ))}
            </div>

            {/* Delivery Method */}
            <div className="border-t border-border px-6 py-5 md:px-7">
              <Label className="mb-3 block text-sm font-medium">Delivery method</Label>
              <RadioGroup
                value={notificationPrefs.delivery_method}
                onValueChange={(value: string) =>
                  setNotificationPrefs({
                    ...notificationPrefs,
                    delivery_method: value as 'email' | 'in_app' | 'both',
                  })
                }
                className="space-y-2.5"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both" id="both" />
                  <Label
                    htmlFor="both"
                    className="cursor-pointer text-sm font-normal text-muted-foreground"
                  >
                    Email and in-app notifications
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="email_method" />
                  <Label
                    htmlFor="email_method"
                    className="cursor-pointer text-sm font-normal text-muted-foreground"
                  >
                    Email only
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="in_app" id="in_app" />
                  <Label
                    htmlFor="in_app"
                    className="cursor-pointer text-sm font-normal text-muted-foreground"
                  >
                    In-app only
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Save button */}
            <div className="border-t border-border bg-muted/20 px-6 py-4 md:px-7">
              <Button
                type="submit"
                disabled={notificationsSaving}
                className="min-h-[40px] cursor-pointer rounded-xl bg-primary text-primary-foreground"
              >
                {notificationsSaving ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="mr-1.5 h-4 w-4" />
                    Save preferences
                  </>
                )}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
