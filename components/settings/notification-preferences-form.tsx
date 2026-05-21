'use client';

import { useState, useTransition } from 'react';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { updateNotificationPreferences } from '@/app/actions/notification-preferences';
import { type NotificationPreferencesInput } from '@/lib/validation';
import { Mail, Bell, Loader2, Save } from 'lucide-react';

type NotificationPreferencesFormProps = {
  initialPreferences: NotificationPreferencesInput;
  userRole: 'admin' | 'employee' | 'client';
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
        toast.success('Preferences saved');
      } else {
        toast.error(result.error || 'Failed to save preferences');
      }
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      {/* Notification Types */}
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="p-5 pb-0">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.08] dark:bg-primary/15">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Email notifications</h2>
              <p className="text-sm text-muted-foreground">
                Choose which alerts should leave the app
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-px bg-border/50 p-px md:grid-cols-2">
          {isClient ? (
            <>
              <div className="flex min-h-[64px] items-center justify-between bg-card px-4 py-4 md:px-5">
                <div className="flex-1">
                  <Label htmlFor="project_update" className="text-sm font-medium">
                    Project status changes
                  </Label>
                  <p className="text-sm text-muted-foreground">When a project changes state</p>
                </div>
                <Switch
                  id="project_update"
                  checked={preferences.project_update}
                  onCheckedChange={(checked) => handleToggle('project_update', checked)}
                />
              </div>

              <div className="flex min-h-[64px] items-center justify-between bg-card px-4 py-4 md:px-5">
                <div className="flex-1">
                  <Label htmlFor="meeting_reminder" className="text-sm font-medium">
                    Meeting reminders
                  </Label>
                  <p className="text-sm text-muted-foreground">Before scheduled meetings</p>
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
              <div className="flex min-h-[64px] items-center justify-between bg-card px-4 py-4 md:px-5">
                <div className="flex-1">
                  <Label htmlFor="task_assigned" className="text-sm font-medium">
                    Task assignments
                  </Label>
                  <p className="text-sm text-muted-foreground">When a task is assigned to you</p>
                </div>
                <Switch
                  id="task_assigned"
                  checked={preferences.task_assigned}
                  onCheckedChange={(checked) => handleToggle('task_assigned', checked)}
                />
              </div>

              <div className="flex min-h-[64px] items-center justify-between bg-card px-4 py-4 md:px-5">
                <div className="flex-1">
                  <Label htmlFor="task_due_soon" className="text-sm font-medium">
                    Task due soon
                  </Label>
                  <p className="text-sm text-muted-foreground">As due dates approach</p>
                </div>
                <Switch
                  id="task_due_soon"
                  checked={preferences.task_due_soon}
                  onCheckedChange={(checked) => handleToggle('task_due_soon', checked)}
                />
              </div>

              <div className="flex min-h-[64px] items-center justify-between bg-card px-4 py-4 md:px-5">
                <div className="flex-1">
                  <Label htmlFor="project_update" className="text-sm font-medium">
                    Project updates
                  </Label>
                  <p className="text-sm text-muted-foreground">Status changes and milestones</p>
                </div>
                <Switch
                  id="project_update"
                  checked={preferences.project_update}
                  onCheckedChange={(checked) => handleToggle('project_update', checked)}
                />
              </div>

              <div className="flex min-h-[64px] items-center justify-between bg-card px-4 py-4 md:px-5">
                <div className="flex-1">
                  <Label htmlFor="meeting_reminder" className="text-sm font-medium">
                    Meeting reminders
                  </Label>
                  <p className="text-sm text-muted-foreground">Before scheduled meetings</p>
                </div>
                <Switch
                  id="meeting_reminder"
                  checked={preferences.meeting_reminder}
                  onCheckedChange={(checked) => handleToggle('meeting_reminder', checked)}
                />
              </div>

              <div className="flex min-h-[64px] items-center justify-between bg-card px-4 py-4 md:px-5">
                <div className="flex-1">
                  <Label htmlFor="client_activity" className="text-sm font-medium">
                    Client activity
                  </Label>
                  <p className="text-sm text-muted-foreground">Comments, files, and approvals</p>
                </div>
                <Switch
                  id="client_activity"
                  checked={preferences.client_activity}
                  onCheckedChange={(checked) => handleToggle('client_activity', checked)}
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Delivery Method */}
      <section className="rounded-xl border border-border bg-card">
        <div className="p-5 pb-0">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.08] dark:bg-primary/15">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Delivery method</h2>
              <p className="text-sm text-muted-foreground">Default notification channel</p>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5">
          <RadioGroup
            value={preferences.delivery_method}
            onValueChange={handleDeliveryMethodChange}
            className="space-y-2"
          >
            <div className="flex items-center space-x-3 rounded-lg border border-border p-4 transition-colors duration-150 hover:bg-muted/30">
              <RadioGroupItem value="both" id="both" />
              <Label htmlFor="both" className="flex-1 cursor-pointer">
                <div className="text-sm font-medium">Email and in-app</div>
                <p className="text-sm text-muted-foreground">Send both copies</p>
              </Label>
            </div>

            <div className="flex items-center space-x-3 rounded-lg border border-border p-4 transition-colors duration-150 hover:bg-muted/30">
              <RadioGroupItem value="email" id="email" />
              <Label htmlFor="email" className="flex-1 cursor-pointer">
                <div className="text-sm font-medium">Email only</div>
                <p className="text-sm text-muted-foreground">Keep the portal quiet</p>
              </Label>
            </div>

            <div className="flex items-center space-x-3 rounded-lg border border-border p-4 transition-colors duration-150 hover:bg-muted/30">
              <RadioGroupItem value="in_app" id="in_app" />
              <Label htmlFor="in_app" className="flex-1 cursor-pointer">
                <div className="text-sm font-medium">In-app only</div>
                <p className="text-sm text-muted-foreground">No email copy</p>
              </Label>
            </div>
          </RadioGroup>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex justify-end lg:col-span-2">
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="min-h-[44px] cursor-pointer rounded-lg bg-primary text-primary-foreground"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-1.5 h-4 w-4" />
              Save changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
