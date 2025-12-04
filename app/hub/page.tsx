import { getCurrentWorkspaceId } from '@/app/actions';
import { redirect } from 'next/navigation';
import { HubContent } from '@/components/hub/hub-content';

export default async function HubPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    redirect('/auth/login');
  }

  return <HubContent workspaceId={workspaceId} />;
}
