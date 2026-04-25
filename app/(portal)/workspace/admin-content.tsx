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
    <div className="space-y-6 px-[clamp(1.5rem,4vw,2.5rem)] pb-[clamp(1.5rem,3vw,2.5rem)] pt-16 md:pt-[clamp(1.5rem,3vw,2.5rem)]">
      {/* Page header */}
      <header className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <LayoutGrid className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Portal Administration
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage apps, branding, and client access
            </p>
          </div>
        </div>
      </header>

      {/* Tabbed sections */}
      <Tabs defaultValue="apps" className="space-y-6">
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
