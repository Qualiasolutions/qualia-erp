import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BoardContent } from '@/components/board/board-content';

export default async function BoardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user's default workspace
  const { data: workspaceMember } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('profile_id', user.id)
    .eq('is_default', true)
    .single();

  const workspaceId = workspaceMember?.workspace_id;

  if (!workspaceId) {
    redirect('/');
  }

  return <BoardContent workspaceId={workspaceId} userId={user.id} />;
}
