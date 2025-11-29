import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

async function AccountInfoLoader() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className="space-y-4">
            <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <p className="text-sm text-foreground mt-1">{user?.email || 'Not logged in'}</p>
            </div>
            <div>
                <label className="text-sm text-muted-foreground">User ID</label>
                <p className="text-xs text-muted-foreground font-mono mt-1">{user?.id || 'N/A'}</p>
            </div>
        </div>
    );
}

function AccountInfoSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div>
                <div className="w-12 h-4 bg-muted rounded mb-1" />
                <div className="w-48 h-4 bg-muted rounded mt-1" />
            </div>
            <div>
                <div className="w-16 h-4 bg-muted rounded mb-1" />
                <div className="w-64 h-3 bg-muted rounded mt-1" />
            </div>
        </div>
    );
}

export default function SettingsPage() {
    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
                <h1 className="text-lg font-medium text-foreground">Settings</h1>
            </header>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl space-y-6">
                    {/* Account Section */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <h2 className="text-md font-medium text-foreground mb-4">Account</h2>
                        <Suspense fallback={<AccountInfoSkeleton />}>
                            <AccountInfoLoader />
                        </Suspense>
                    </div>

                    {/* Appearance Section */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <h2 className="text-md font-medium text-foreground mb-4">Appearance</h2>
                        <p className="text-sm text-muted-foreground">
                            Use the theme toggle in the header to switch between light and dark mode.
                        </p>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-card border border-red-900/50 rounded-lg p-6">
                        <h2 className="text-md font-medium text-red-400 mb-4">Danger Zone</h2>
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
