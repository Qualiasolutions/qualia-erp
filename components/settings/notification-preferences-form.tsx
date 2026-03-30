'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { updateNotificationPreferences } from '@/app/actions/notification-preferences';
import { type NotificationPreferencesInput } from '@/lib/validation';
import { Mail, Bell, CheckCircle2 } from 'lucide-react';

type NotificationPreferencesFormProps = {
  initialPreferences: NotificationPreferencesInput;
  userRole: 'admin' | 'manager' | 'client';
};

export function NotificationPreferencesForm({
  initialPreferences,
  userRole,
}: NotificationPreferencesFormProps) {
  const [preferences, setPreferences] = useState<NotificationPreferencesInput>(initialPreferences);
  const [isPending, startTransition] = useTransition();

  const isClient = userRole === 'client';

  const handleToggle = (key: keyof NotificationPreferencesInput, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleDeliveryMethodChange = (value: string) => {
    setPreferences((prev) => ({ ...prev, delivery_method: value as 'email' | 'in_app' | 'both' }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateNotificationPreferences(preferences);

      if (result.success) {
        toast({
          title: 'Preferences saved',
          description: 'Your notification preferences have been updated.',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save preferences',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Notification Types Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Choose which notifications you&apos;d like to receive via email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isClient ? (
            <>
              {/* Client notification toggles */}
              <div className="flex items-center justify-between space-x-4">
                <div className="flex-1">
                  <Label htmlFor="project_update" className="text-sm font-medium">
                    Project Status Changes
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when project status changes
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
                  <p className="text-sm text-muted-foreground">
                    Get notified about upcoming meetings
                  </p>
                </div>
                <Switch
                  id="meeting_reminder"
                  checked={preferences.meeting_reminder}
                  onCheckedChange={(checked) => handleToggle('meeting_reminder', checked)}
                />
              </div>
            </>
          ) : (
            <>
              {/* Employee notification toggles */}
              <div className="flex items-center justify-between space-x-4">
                <div className="flex-1">
                  <Label htmlFor="task_assigned" className="text-sm font-medium">
                    Task Assignments
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when tasks are assigned to you
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
                    Task Due Soon
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when tasks are approaching their due date
                  </p>
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
                  <p className="text-sm text-muted-foreground">
                    Get notified about project status changes and updates
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
                  <p className="text-sm text-muted-foreground">
                    Get notified about upcoming meetings
                  </p>
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
                  <p className="text-sm text-muted-foreground">
                    Get notified when clients comment, upload files, or take actions
                  </p>
                </div>
                <Switch
                  id="client_activity"
                  checked={preferences.client_activity}
                  onCheckedChange={(checked) => handleToggle('client_activity', checked)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delivery Method Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Delivery Method
          </CardTitle>
          <CardDescription>Choose how you&apos;d like to receive notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={preferences.delivery_method}
            onValueChange={handleDeliveryMethodChange}
          >
            <div className="flex items-center space-x-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
              <RadioGroupItem value="both" id="both" />
              <Label htmlFor="both" className="flex-1 cursor-pointer">
                <div className="font-medium">Email and In-App</div>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email and in the app
                </p>
              </Label>
            </div>

            <div className="flex items-center space-x-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
              <RadioGroupItem value="email" id="email" />
              <Label htmlFor="email" className="flex-1 cursor-pointer">
                <div className="font-medium">Email Only</div>
                <p className="text-sm text-muted-foreground">Only receive email notifications</p>
              </Label>
            </div>

            <div className="flex items-center space-x-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
              <RadioGroupItem value="in_app" id="in_app" />
              <Label htmlFor="in_app" className="flex-1 cursor-pointer">
                <div className="font-medium">In-App Only</div>
                <p className="text-sm text-muted-foreground">
                  Only receive notifications within the app
                </p>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending} className="min-w-[120px]">
          {isPending ? (
            <>Saving...</>
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
