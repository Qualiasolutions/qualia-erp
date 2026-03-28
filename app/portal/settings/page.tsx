'use client';

import { useState, useEffect } from 'react';
import { Loader2, User, Bell, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/components/ui/use-toast';
import {
  updateClientProfile,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/app/actions/client-portal';
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

const notificationItems = [
  {
    id: 'task_assigned',
    label: 'Task Assignments',
    description: 'Notify me when a task is assigned to me',
  },
  {
    id: 'task_due_soon',
    label: 'Task Due Soon',
    description: 'Notify me when tasks are approaching their due date',
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

export default function PortalSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileFormData>({
    full_name: '',
    email: '',
    company: '',
  });
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    task_assigned: true,
    task_due_soon: true,
    project_update: true,
    meeting_reminder: true,
    client_activity: true,
    delivery_method: 'both',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [notificationsSaving, setNotificationsSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          toast({
            title: 'Error',
            description: 'Not authenticated',
            variant: 'destructive',
          });
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, company')
          .eq('id', user.id)
          .single();

        if (profile) {
          setProfileData({
            full_name: profile.full_name || '',
            email: profile.email || user.email || '',
            company: profile.company || '',
          });
        }

        const prefsResult = await getNotificationPreferences();
        if (prefsResult.success && prefsResult.data) {
          setNotificationPrefs(prefsResult.data as NotificationPreferences);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast({
          title: 'Error',
          description: 'Failed to load settings',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);

    try {
      const result = await updateClientProfile({
        full_name: profileData.full_name,
        company: profileData.company || null,
      });

      if (result.success) {
        toast({ title: 'Success', description: 'Profile updated successfully' });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update profile',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
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
        toast({ title: 'Success', description: 'Notification preferences updated' });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update preferences',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to update preferences',
        variant: 'destructive',
      });
    } finally {
      setNotificationsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <h1 className="text-[clamp(1.25rem,3vw,1.5rem)] font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Manage your account and notification preferences
        </p>
      </div>

      {/* Profile Settings */}
      <section className="space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/[0.08] dark:bg-primary/15">
            <User className="h-4 w-4 text-primary dark:text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-foreground">Profile Information</h2>
            <p className="text-[12px] text-muted-foreground">Update your personal details</p>
          </div>
        </div>

        <form
          onSubmit={handleProfileSubmit}
          className="space-y-4 rounded-xl border border-primary/[0.08] bg-card p-5 dark:border-primary/[0.12]"
        >
          <div className="space-y-1.5">
            <Label htmlFor="full_name" className="text-[13px]">
              Display Name
            </Label>
            <Input
              id="full_name"
              type="text"
              value={profileData.full_name}
              onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
              placeholder="Your name"
              required
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[13px]">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={profileData.email}
              disabled
              className="h-9 bg-muted/50"
            />
            <p className="text-[11px] text-muted-foreground/70">
              Email cannot be changed. Contact support if you need to update it.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company" className="text-[13px]">
              Company
            </Label>
            <Input
              id="company"
              type="text"
              value={profileData.company}
              onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
              placeholder="Your company name (optional)"
              className="h-9"
            />
          </div>

          <div className="pt-1">
            <Button
              type="submit"
              disabled={profileSaving}
              size="sm"
              className="min-h-[44px] bg-primary text-white hover:bg-qualia-700"
            >
              {profileSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </form>
      </section>

      {/* Notification Preferences */}
      <section className="space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/[0.08] dark:bg-amber-500/15">
            <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-foreground">Notification Preferences</h2>
            <p className="text-[12px] text-muted-foreground">
              Choose which notifications you receive
            </p>
          </div>
        </div>

        <form
          onSubmit={handleNotificationSubmit}
          className="rounded-xl border border-primary/[0.08] bg-card dark:border-primary/[0.12]"
        >
          {/* Notification Toggles */}
          <div className="divide-y divide-primary/[0.06]">
            {notificationItems.map((item) => (
              <div
                key={item.id}
                className="flex min-h-[56px] items-center justify-between px-5 py-4"
              >
                <div className="space-y-0.5">
                  <Label htmlFor={item.id} className="text-[13px] font-medium">
                    {item.label}
                  </Label>
                  <p className="text-[12px] text-muted-foreground">{item.description}</p>
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
          <div className="border-t border-border px-5 py-5">
            <Label className="mb-3 block text-[13px] font-medium">Delivery Method</Label>
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
                <Label htmlFor="both" className="text-[13px] font-normal text-muted-foreground">
                  Email and in-app notifications
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="email_method" />
                <Label
                  htmlFor="email_method"
                  className="text-[13px] font-normal text-muted-foreground"
                >
                  Email only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="in_app" id="in_app" />
                <Label htmlFor="in_app" className="text-[13px] font-normal text-muted-foreground">
                  In-app only
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Save button */}
          <div className="border-t border-border px-5 py-4">
            <Button
              type="submit"
              disabled={notificationsSaving}
              size="sm"
              className="min-h-[44px] bg-primary text-white hover:bg-qualia-700"
            >
              {notificationsSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
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
