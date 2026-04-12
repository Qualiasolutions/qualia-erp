import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MessagesContent } from './messages-content';

export const metadata: Metadata = {
  title: 'Messages | Portal',
};

export default async function PortalMessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', user.id)
    .single();

  const userName = profile?.full_name || user.email?.split('@')[0] || 'User';
  const userRole = profile?.role || 'client';

  return <MessagesContent userId={user.id} userName={userName} userRole={userRole} />;
}
