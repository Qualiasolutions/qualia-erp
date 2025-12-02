'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/components/workspace-provider';
import { ActiveUsers, ActiveUsersSkeleton } from '@/components/active-users';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export function DashboardActiveUsers() {
  const { currentWorkspace } = useWorkspace();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', authUser.id)
          .single();

        setUser({
          id: authUser.id,
          name: profile?.full_name || authUser.email?.split('@')[0] || 'User',
          email: authUser.email || '',
          avatarUrl: profile?.avatar_url,
        });
      }

      setIsLoading(false);
    }

    loadUser();
  }, []);

  if (isLoading) {
    return <ActiveUsersSkeleton />;
  }

  if (!user || !currentWorkspace) {
    return null;
  }

  return (
    <ActiveUsers channelName={`workspace-presence:${currentWorkspace.id}`} currentUser={user} />
  );
}
