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
    if (!allowed) redirect('/');
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
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
            <svg
              className="h-5 w-5 text-amber-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Notification Preferences
            </h1>
            <p className="text-sm text-muted-foreground">
              Control which notifications you receive and how they&apos;re delivered.
            </p>
          </div>
        </div>
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
