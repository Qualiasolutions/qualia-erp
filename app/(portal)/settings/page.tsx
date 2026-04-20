import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getNotificationPreferences } from '@/app/actions/client-portal';
import { SettingsContent } from './settings-content';

export const metadata: Metadata = { title: 'Settings' };

export default async function PortalSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch profile and notification preferences in parallel on the server
  const [profileResult, prefsResult] = await Promise.all([
    supabase.from('profiles').select('full_name, email, company, role').eq('id', user.id).single(),
    getNotificationPreferences(),
  ]);

  const profile = profileResult.data;

  const initialProfile = {
    full_name: profile?.full_name || '',
    email: profile?.email || user.email || '',
    company: profile?.company || '',
  };

  const initialNotifications =
    prefsResult.success && prefsResult.data
      ? (prefsResult.data as {
          task_assigned: boolean;
          task_due_soon: boolean;
          project_update: boolean;
          meeting_reminder: boolean;
          client_activity: boolean;
          delivery_method: 'email' | 'in_app' | 'both';
        })
      : {
          task_assigned: true,
          task_due_soon: true,
          project_update: true,
          meeting_reminder: true,
          client_activity: true,
          delivery_method: 'both' as const,
        };

  return (
    <SettingsContent
      initialProfile={initialProfile}
      initialNotifications={initialNotifications}
      userRole={profile?.role || 'client'}
    />
  );
}
