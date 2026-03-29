import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getClientFeatureRequests } from '@/app/actions/client-requests';
import { PortalRequestList } from '@/components/portal/portal-request-list';
import { fadeInClasses } from '@/lib/transitions';

export default async function PortalRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get feature requests
  const requestsResult = await getClientFeatureRequests();
  const requests = (requestsResult.success ? requestsResult.data : []) as Array<{
    id: string;
    title: string;
    description: string | null;
    priority: string;
    status: string;
    admin_response: string | null;
    created_at: string;
    project: { id: string; name: string } | null;
  }>;

  return (
    <div className={`space-y-6 ${fadeInClasses}`}>
      <div>
        <h1 className="text-[clamp(1.25rem,3vw,1.5rem)] font-bold tracking-tight text-foreground">
          Requests
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Track your feature requests and changes
        </p>
      </div>

      <PortalRequestList requests={requests} />
    </div>
  );
}
