import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { assertAppEnabledForClient } from '@/lib/portal-utils';
import { NotificationPreferencesForm } from '@/components/settings/notification-preferences-form';
import {
  getNotificationPreferences,
  createDefaultPreferences,
} from '@/app/actions/notification-preferences';
import { type NotificationPreferencesInput } from '@/lib/validation';

export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/auth/login');
  }

  // App Library guard: block clients if the "settings" app is disabled
  if (profile.role === 'client') {
    const allowed = await assertAppEnabledForClient(user.id, 'settings', profile.role);
    if (!allowed) redirect('/dashboard');
  }

  // Get workspace_id from workspace_members (not on profiles table)
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('profile_id', user.id)
    .eq('is_default', true)
    .single();

  const workspaceId = membership?.workspace_id;

  // Get notification preferences
  const result = await getNotificationPreferences();
  let preferences = result.data as NotificationPreferencesInput | undefined;

  // Create default preferences if none exist
  if (!preferences && workspaceId) {
    const defaultResult = await createDefaultPreferences(user.id, workspaceId);
    if (defaultResult.success) {
      // Fetch again after creating defaults
      const refreshResult = await getNotificationPreferences();
      preferences = refreshResult.data as NotificationPreferencesInput | undefined;
    }
  }

  return (
    <div className="space-y-4 px-4 pb-8 pt-16 md:px-6 md:pt-6">
      <header className="rounded-xl border border-border bg-card px-3 py-3 shadow-[0_1px_0_hsl(var(--border)/0.45)]">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold tracking-tight text-foreground">Notifications</h1>
          <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />
          <p className="truncate text-sm text-muted-foreground">Delivery and alert preferences</p>
        </div>
      </header>
      {preferences && (
        <NotificationPreferencesForm
          initialPreferences={preferences}
          userRole={profile.role as 'admin' | 'employee' | 'client'}
        />
      )}
    </div>
  );
}
