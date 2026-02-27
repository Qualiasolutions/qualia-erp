import { Suspense } from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/logout-button';
import { LearnModeSettings } from '@/components/settings/learn-mode-settings';
import { AdminNotesSection } from '@/components/ai-assistant/admin-notes-section';
import { ChevronRight, Plug, MessageSquarePlus } from 'lucide-react';

async function AccountInfoLoader() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch profile details
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, job_title, location, role')
    .eq('id', user?.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-qualia-600 text-xl font-medium text-white">
          {profile?.full_name
            ?.split(' ')
            .map((n: string) => n[0])
            .join('') || '?'}
        </div>
        <div>
          <p className="text-lg font-medium text-foreground">{profile?.full_name || 'Unknown'}</p>
          <p className="text-sm text-muted-foreground">{profile?.job_title || 'No title'}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
        <div>
          <label className="text-sm text-muted-foreground">Email</label>
          <p className="mt-1 text-sm text-foreground">{user?.email || 'Not logged in'}</p>
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Location</label>
          <p className="mt-1 text-sm text-foreground">{profile?.location || 'Not set'}</p>
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Role</label>
          <p className="mt-1 text-sm capitalize text-foreground">{profile?.role || 'N/A'}</p>
        </div>
        <div>
          <label className="text-sm text-muted-foreground">User ID</label>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{user?.id || 'N/A'}</p>
        </div>
      </div>

      {/* Integrations Link (Admin Only) */}
      {isAdmin && (
        <Link
          href="/settings/integrations"
          className="mt-4 flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-qualia-500/10">
              <Plug className="h-5 w-5 text-qualia-500" />
            </div>
            <div>
              <p className="font-medium text-foreground">Integrations</p>
              <p className="text-sm text-muted-foreground">Connect GitHub, Vercel, and VAPI</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      )}
    </div>
  );
}

async function AdminNotesLoader() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return null;

  return <AdminNotesSection currentUserId={user.id} />;
}

async function AdminNotesWrapper() {
  const content = await AdminNotesLoader();
  if (!content) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquarePlus className="h-5 w-5 text-primary" />
        <h2 className="text-md font-medium text-foreground">AI Assistant Notes</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Leave notes for team members that the AI assistant will deliver in their next conversation.
      </p>
      {content}
    </div>
  );
}

function AccountInfoSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div>
        <div className="mb-1 h-4 w-12 rounded bg-muted" />
        <div className="mt-1 h-4 w-48 rounded bg-muted" />
      </div>
      <div>
        <div className="mb-1 h-4 w-16 rounded bg-muted" />
        <div className="mt-1 h-3 w-64 rounded bg-muted" />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border/20 bg-background px-6 py-3.5">
        <h1 className="text-lg font-medium text-foreground">Settings</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-6">
          {/* Account Section */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-md mb-4 font-medium text-foreground">Account</h2>
            <Suspense fallback={<AccountInfoSkeleton />}>
              <AccountInfoLoader />
            </Suspense>
          </div>

          {/* Learning & Development Section */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-md mb-4 font-medium text-foreground">Learning & Development</h2>
            <LearnModeSettings />
          </div>

          {/* AI Assistant Notes (Admin Only) */}
          <Suspense fallback={null}>
            <AdminNotesWrapper />
          </Suspense>

          {/* Appearance Section */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-md mb-4 font-medium text-foreground">Appearance</h2>
            <p className="text-sm text-muted-foreground">
              Use the theme toggle in the header to switch between light and dark mode.
            </p>
          </div>

          {/* Danger Zone */}
          <div className="rounded-lg border border-red-900/50 bg-card p-6">
            <h2 className="text-md mb-4 font-medium text-red-400">Danger Zone</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Sign Out</p>
                <p className="text-xs text-muted-foreground">Sign out of your account</p>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
