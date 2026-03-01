import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { isClientRole } from '@/lib/portal-utils';
import { PortalHeader } from '@/components/portal/portal-header';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Verify user is actually a client
  const isClient = await isClientRole(user.id);
  if (!isClient) {
    redirect('/'); // Non-clients shouldn't be here
  }

  // Get user profile for display
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen bg-neutral-50">
      <PortalHeader user={user} profile={profile} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      <footer className="border-t border-neutral-200 bg-white py-6 text-center text-sm text-neutral-600">
        <div className="mx-auto max-w-7xl px-4">
          &copy; {new Date().getFullYear()} Qualia Solutions. Need help?{' '}
          <a
            href="mailto:support@qualiasolutions.io"
            className="text-qualia-600 hover:text-qualia-700 underline"
          >
            Contact Support
          </a>
        </div>
      </footer>
    </div>
  );
}
