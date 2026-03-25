'use client';

import { useState, useEffect, useTransition } from 'react';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/app/actions/notification-preferences';
import { type NotificationPreferencesInput } from '@/lib/validation';
import { Bell, Mail, CheckCircle2 } from 'lucide-react';

export function NotificationSection() {
  const [preferences, setPreferences] = useState<NotificationPreferencesInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function load() {
      const result = await getNotificationPreferences();
      if (result.success && result.data) {
        setPreferences(result.data as NotificationPreferencesInput);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleToggle = (key: keyof NotificationPreferencesInput, value: boolean) => {
    setPreferences((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  const handleDeliveryMethodChange = (value: string) => {
    setPreferences((prev) =>
      prev ? { ...prev, delivery_method: value as 'email' | 'in_app' | 'both' } : null
    );
  };

  const handleSave = () => {
    if (!preferences) return;

    startTransition(async () => {
      const result = await updateNotificationPreferences(preferences);

      if (result.success) {
        toast.success('Notification preferences saved');
      } else {
        toast.error(result.error || 'Failed to save preferences');
      }
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="h-24 w-full rounded bg-muted" />
        <div className="h-48 w-full rounded bg-muted" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <p className="text-sm text-muted-foreground">Unable to load notification preferences.</p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Type Toggles */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-medium">Notification Types</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Choose which notifications you&apos;d like to receive
        </p>

        <div className="space-y-4 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1">
              <Label htmlFor="task_assigned" className="text-sm font-medium">
                Task Assignments
              </Label>
              <p className="text-xs text-muted-foreground">
                Get notified when a task is assigned to you
              </p>
            </div>
            <Switch
              id="task_assigned"
              checked={preferences.task_assigned}
              onCheckedChange={(checked) => handleToggle('task_assigned', checked)}
            />
          </div>

          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1">
              <Label htmlFor="task_due_soon" className="text-sm font-medium">
                Due Date Reminders
              </Label>
              <p className="text-xs text-muted-foreground">Get notified when tasks are due soon</p>
            </div>
            <Switch
              id="task_due_soon"
              checked={preferences.task_due_soon}
              onCheckedChange={(checked) => handleToggle('task_due_soon', checked)}
            />
          </div>

          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1">
              <Label htmlFor="project_update" className="text-sm font-medium">
                Project Updates
              </Label>
              <p className="text-xs text-muted-foreground">
                Get notified about project status changes
              </p>
            </div>
            <Switch
              id="project_update"
              checked={preferences.project_update}
              onCheckedChange={(checked) => handleToggle('project_update', checked)}
            />
          </div>

          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1">
              <Label htmlFor="meeting_reminder" className="text-sm font-medium">
                Meeting Reminders
              </Label>
              <p className="text-xs text-muted-foreground">Get reminded about upcoming meetings</p>
            </div>
            <Switch
              id="meeting_reminder"
              checked={preferences.meeting_reminder}
              onCheckedChange={(checked) => handleToggle('meeting_reminder', checked)}
            />
          </div>

          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1">
              <Label htmlFor="client_activity" className="text-sm font-medium">
                Client Activity
              </Label>
              <p className="text-xs text-muted-foreground">
                Get notified when clients take actions on your projects
              </p>
            </div>
            <Switch
              id="client_activity"
              checked={preferences.client_activity}
              onCheckedChange={(checked) => handleToggle('client_activity', checked)}
            />
          </div>
        </div>
      </div>

      {/* Delivery Method */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-medium">Delivery Method</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Choose how you&apos;d like to receive notifications
        </p>

        <RadioGroup
          value={preferences.delivery_method}
          onValueChange={handleDeliveryMethodChange}
          className="space-y-3"
        >
          <div className="flex items-center space-x-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
            <RadioGroupItem value="both" id="both" />
            <Label htmlFor="both" className="flex-1 cursor-pointer">
              <div className="font-medium">Email and In-App</div>
              <p className="text-xs text-muted-foreground">
                Receive notifications via email and in the app
              </p>
            </Label>
          </div>

          <div className="flex items-center space-x-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
            <RadioGroupItem value="email" id="email" />
            <Label htmlFor="email" className="flex-1 cursor-pointer">
              <div className="font-medium">Email Only</div>
              <p className="text-xs text-muted-foreground">Only receive email notifications</p>
            </Label>
          </div>

          <div className="flex items-center space-x-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
            <RadioGroupItem value="in_app" id="in_app" />
            <Label htmlFor="in_app" className="flex-1 cursor-pointer">
              <div className="font-medium">In-App Only</div>
              <p className="text-xs text-muted-foreground">
                Only receive notifications within the app
              </p>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Save Button */}
      <div className="flex justify-end border-t border-border pt-4">
        <Button onClick={handleSave} disabled={isPending || !preferences} className="min-w-[120px]">
          {isPending ? (
            'Saving...'
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
