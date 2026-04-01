import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
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
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Notification Preferences</h1>
        <p className="mt-2 text-muted-foreground">
          Control which notifications you receive and how they&apos;re delivered.
        </p>
      </div>

      {preferences && (
        <NotificationPreferencesForm
          initialPreferences={preferences}
          userRole={profile.role as 'admin' | 'employee' | 'client'}
        />
      )}
    </div>
  );
}
