'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LayoutGrid, Palette, Settings, Users } from 'lucide-react';
import { AppLibrary } from './app-library';
import { BrandingSettings } from './branding-settings';
import { ClientAccess } from './client-access';
import { PortalSettings } from './portal-settings';

interface AdminContentProps {
  workspaceId: string;
  userRole: string | null;
}

export function AdminContent({ workspaceId }: AdminContentProps) {
  return (
    <div className="space-y-4 px-4 pb-6 pt-16 md:px-6 md:pt-6">
      <header className="rounded-xl border border-border bg-card px-3 py-3 shadow-[0_1px_0_hsl(var(--border)/0.45)]">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold tracking-tight text-foreground">Portal admin</h1>
          <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />
          <p className="truncate text-sm text-muted-foreground">
            Apps, branding, and client access
          </p>
        </div>
      </header>

      {/* Tabbed sections */}
      <Tabs defaultValue="apps" className="space-y-4">
        <TabsList>
          <TabsTrigger value="apps" className="gap-1.5">
            <LayoutGrid className="h-4 w-4" />
            Apps
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-1.5">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-1.5">
            <Users className="h-4 w-4" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apps">
          <AppLibrary workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value="branding">
          <BrandingSettings workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value="clients">
          <ClientAccess workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value="settings">
          <PortalSettings workspaceId={workspaceId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
