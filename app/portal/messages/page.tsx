import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getClientActivityFeed } from '@/app/actions/client-portal';
import { PortalMessages } from '@/components/portal/portal-messages';
import { fadeInClasses } from '@/lib/transitions';

export default async function PortalMessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const result = await getClientActivityFeed(user.id, 20);

  const feedData = result.success
    ? (result.data as {
        items: Array<{
          id: string;
          project_id: string;
          action_type: string;
          actor_id: string;
          action_data: Record<string, unknown> | null;
          is_client_visible: boolean | null;
          created_at: string | null;
          project: { id: string; name: string } | null;
          actor: {
            id: string;
            full_name: string | null;
            avatar_url: string | null;
            email: string | null;
          } | null;
        }>;
        hasMore: boolean;
        nextCursor: string | null;
      })
    : { items: [], hasMore: false, nextCursor: null };

  return (
    <div className={`space-y-6 ${fadeInClasses}`}>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Messages</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Updates and activity across all your projects
        </p>
      </div>

      <PortalMessages
        initialActivities={feedData.items}
        clientId={user.id}
        initialHasMore={feedData.hasMore}
        initialNextCursor={feedData.nextCursor}
      />
    </div>
  );
}
