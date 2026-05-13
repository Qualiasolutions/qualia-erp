import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { StaffMessagesContent } from './staff-messages-content';

export const metadata: Metadata = {
  title: 'Messages | Portal',
};

export default async function MessagesPage() {
  const user = await getPortalAuthUser();
  if (!user) {
    redirect('/auth/login');
  }

  const profile = await getPortalProfile(user.id);
  if (profile?.role === 'client') {
    redirect('/dashboard');
  }

  return (
    <StaffMessagesContent
      userId={user.id}
      userName={profile?.full_name || user.email?.split('@')[0] || 'User'}
      userRole={profile?.role || 'employee'}
    />
  );
}
