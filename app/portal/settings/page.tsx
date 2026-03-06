'use client';

import { useState, useEffect } from 'react';
import { Loader2, User, Bell, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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

        // Get profile data
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

        // Get notification preferences
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
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
        });
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
        toast({
          title: 'Success',
          description: 'Notification preferences updated',
        });
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your account settings and notification preferences
        </p>
      </div>

      <Separator />

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-qualia-600" />
            <CardTitle>Profile Information</CardTitle>
          </div>
          <CardDescription>Update your personal information and company details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Display Name</Label>
              <Input
                id="full_name"
                type="text"
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                placeholder="Your name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed. Contact support if you need to update it.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                type="text"
                value={profileData.company}
                onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                placeholder="Your company name (optional)"
              />
            </div>

            <Button type="submit" disabled={profileSaving} className="bg-qualia-600 hover:bg-qualia-700">
              {profileSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Profile
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-qualia-600" />
            <CardTitle>Notification Preferences</CardTitle>
          </div>
          <CardDescription>Choose which notifications you want to receive</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleNotificationSubmit} className="space-y-6">
            {/* Notification Toggles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="task_assigned">Task Assignments</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify me when a task is assigned to me
                  </p>
                </div>
                <Switch
                  id="task_assigned"
                  checked={notificationPrefs.task_assigned}
                  onCheckedChange={(checked) =>
                    setNotificationPrefs({ ...notificationPrefs, task_assigned: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="task_due_soon">Task Due Soon</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify me when tasks are approaching their due date
                  </p>
                </div>
                <Switch
                  id="task_due_soon"
                  checked={notificationPrefs.task_due_soon}
                  onCheckedChange={(checked) =>
                    setNotificationPrefs({ ...notificationPrefs, task_due_soon: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="project_update">Project Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify me about important project milestones and updates
                  </p>
                </div>
                <Switch
                  id="project_update"
                  checked={notificationPrefs.project_update}
                  onCheckedChange={(checked) =>
                    setNotificationPrefs({ ...notificationPrefs, project_update: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="meeting_reminder">Meeting Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify me before scheduled meetings
                  </p>
                </div>
                <Switch
                  id="meeting_reminder"
                  checked={notificationPrefs.meeting_reminder}
                  onCheckedChange={(checked) =>
                    setNotificationPrefs({ ...notificationPrefs, meeting_reminder: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="client_activity">Activity Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify me about team activity on my projects
                  </p>
                </div>
                <Switch
                  id="client_activity"
                  checked={notificationPrefs.client_activity}
                  onCheckedChange={(checked) =>
                    setNotificationPrefs({ ...notificationPrefs, client_activity: checked })
                  }
                />
              </div>
            </div>

            <Separator />

            {/* Delivery Method */}
            <div className="space-y-3">
              <Label>Delivery Method</Label>
              <RadioGroup
                value={notificationPrefs.delivery_method}
                onValueChange={(value) =>
                  setNotificationPrefs({
                    ...notificationPrefs,
                    delivery_method: value as 'email' | 'in_app' | 'both',
                  })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both" id="both" />
                  <Label htmlFor="both" className="font-normal">
                    Email and in-app notifications
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="email" />
                  <Label htmlFor="email" className="font-normal">
                    Email only
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="in_app" id="in_app" />
                  <Label htmlFor="in_app" className="font-normal">
                    In-app only
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              type="submit"
              disabled={notificationsSaving}
              className="bg-qualia-600 hover:bg-qualia-700"
            >
              {notificationsSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
