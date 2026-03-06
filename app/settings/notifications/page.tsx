import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NotificationPreferencesForm } from '@/components/settings/notification-preferences-form';
import {
  getNotificationPreferences,
  createDefaultPreferences,
} from '@/app/actions/notification-preferences';

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
    .select('workspace_id, role, full_name')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/auth/login');
  }

  // Get notification preferences
  const result = await getNotificationPreferences();
  let preferences = result.data;

  // Create default preferences if none exist
  if (!preferences) {
    const defaultResult = await createDefaultPreferences(user.id, profile.workspace_id);
    if (defaultResult.success) {
      // Fetch again after creating defaults
      const refreshResult = await getNotificationPreferences();
      preferences = refreshResult.data;
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
        <NotificationPreferencesForm initialPreferences={preferences} userRole={profile.role} />
      )}
    </div>
  );
}
