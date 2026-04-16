import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateDefaultBoard } from '@/app/actions/admin-boards';
import { BoardCanvas } from './board-canvas';

export const dynamic = 'force-dynamic';

export default async function AdminBoardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getClaims();
  const userId = userData?.claims?.sub;

  if (!userId) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profile?.role !== 'admin') redirect('/');

  const result = await getOrCreateDefaultBoard();
  if (!result.success || !result.data) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-sm text-muted-foreground">{result.error ?? 'Failed to load board'}</p>
      </div>
    );
  }

  const board = result.data as {
    id: string;
    name: string;
    snapshot: unknown;
  };

  return <BoardCanvas boardId={board.id} boardName={board.name} initialSnapshot={board.snapshot} />;
}
