'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LayoutGrid, Palette, Users } from 'lucide-react';
import { AppLibrary } from './app-library';
import { BrandingSettings } from './branding-settings';
import { ClientAccess } from './client-access';

interface AdminContentProps {
  workspaceId: string;
  userRole: string | null;
}

export function AdminContent({ workspaceId }: AdminContentProps) {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <header>
        <h1 className="text-[clamp(1.5rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight text-foreground">
          Portal Administration
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage apps, branding, and client access
        </p>
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
      </Tabs>
    </div>
  );
}
