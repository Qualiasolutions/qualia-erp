'use client';

import { useState } from 'react';
import { Loader2, User, Bell, Save, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { updateClientProfile, updateNotificationPreferences } from '@/app/actions/client-portal';
import { createClient } from '@/lib/supabase/client';

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
}

const notificationItems = [
  {
    id: 'project_update',
    label: 'Project Updates',
    description: 'Notify me about important project milestones and updates',
  },
  {
    id: 'client_activity',
    label: 'Activity Updates',
    description: 'Notify me about team activity on my projects',
  },
  {
    id: 'meeting_reminder',
    label: 'Meeting Reminders',
    description: 'Notify me before scheduled meetings',
  },
] as const;

function PasswordChangeSection() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password updated successfully');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      toast.error('Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="animate-fade-in rounded-xl border border-border bg-card p-6 fill-mode-both"
      style={{ animationDelay: '100ms' }}
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.08] dark:bg-primary/15">
          <Lock className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Change Password</h2>
          <p className="text-xs text-muted-foreground">Update your account password</p>
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
            disabled={saving || !newPassword || !confirmPassword}
            className="min-h-[44px] cursor-pointer rounded-lg bg-primary text-primary-foreground"
          >
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Lock className="mr-1.5 h-4 w-4" />
                Update Password
              </>
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}

export function SettingsContent({ initialProfile, initialNotifications }: SettingsContentProps) {
  const [profileData, setProfileData] = useState<ProfileFormData>(initialProfile);
  const [notificationPrefs, setNotificationPrefs] =
    useState<NotificationPreferences>(initialNotifications);
  const [profileSaving, setProfileSaving] = useState(false);
  const [notificationsSaving, setNotificationsSaving] = useState(false);

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
    <div className="animate-fade-in-up space-y-6 px-[clamp(1.5rem,4vw,2.5rem)] pb-[clamp(1.5rem,3vw,2.5rem)] pt-16 md:pt-[clamp(1.5rem,3vw,2.5rem)]">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and notification preferences
        </p>
      </div>

      {/* Profile Settings */}
      <section className="animate-fade-in rounded-xl border border-border bg-card p-6 fill-mode-both">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.08] dark:bg-primary/15">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Profile Information</h2>
            <p className="text-xs text-muted-foreground">Update your personal details</p>
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
              className="min-h-[44px] cursor-pointer rounded-lg bg-primary text-primary-foreground"
            >
              {profileSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-4 w-4" />
                  Save Profile
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
        className="animate-fade-in overflow-hidden rounded-xl border border-border bg-card fill-mode-both"
        style={{ animationDelay: '150ms' }}
      >
        <div className="p-6 pb-0">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/[0.08] dark:bg-amber-500/15">
              <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Notification Preferences</h2>
              <p className="text-xs text-muted-foreground">
                Choose which notifications you receive
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleNotificationSubmit}>
          {/* Notification Toggles */}
          <div className="divide-y divide-border/50">
            {notificationItems.map((item) => (
              <div
                key={item.id}
                className="flex min-h-[56px] items-center justify-between px-6 py-4"
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
          <div className="border-t border-border px-6 py-5">
            <Label className="mb-3 block text-sm font-medium">Delivery Method</Label>
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
          <div className="border-t border-border px-6 py-4">
            <Button
              type="submit"
              disabled={notificationsSaving}
              className="min-h-[44px] cursor-pointer rounded-lg bg-primary text-primary-foreground"
            >
              {notificationsSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-4 w-4" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
