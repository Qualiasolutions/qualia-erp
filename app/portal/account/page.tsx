import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { fadeInClasses } from '@/lib/transitions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PortalAccountForm } from './account-form';

export default async function PortalAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role, created_at')
    .eq('id', user.id)
    .single();

  return (
    <div className={`space-y-8 ${fadeInClasses}`}>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account settings</p>
      </div>

      {/* Profile info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <PortalAccountForm
            initialName={profile?.full_name || ''}
            email={profile?.email || user.email || ''}
          />
        </CardContent>
      </Card>

      {/* Account info (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <p className="mt-1 text-sm text-foreground">{profile?.email || user.email}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <p className="mt-1 text-sm capitalize text-foreground">{profile?.role || 'client'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Member Since</label>
              <p className="mt-1 text-sm text-foreground">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Password</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            To change your password, please contact{' '}
            <a
              href="mailto:support@qualiasolutions.io"
              className="font-medium text-qualia-600 hover:text-qualia-700"
            >
              support@qualiasolutions.io
            </a>{' '}
            and we&apos;ll send you a password reset link.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
