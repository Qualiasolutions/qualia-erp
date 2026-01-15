'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectNotes } from '@/components/project-notes';
import { ProjectResources } from '@/components/project-resources';
import { EntityAvatar } from '@/components/entity-avatar';
import { Beaker, MessageSquare, Link as LinkIcon } from 'lucide-react';
import { getProjectById } from '@/app/actions';
import type { ProjectData } from '@/app/projects/page';

interface DemoSheetProps {
  demo: ProjectData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DemoSheet({ demo, open, onOpenChange }: DemoSheetProps) {
  const [resources, setResources] = useState<
    { id: string; type: string; label: string; url: string }[]
  >([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Fetch full project data to get workspace_id and resources
  useEffect(() => {
    if (demo?.id && open) {
      getProjectById(demo.id).then((project) => {
        if (project) {
          setWorkspaceId(project.workspace_id);
          setResources((project.metadata?.resources as typeof resources) || []);
        }
      });
    }
  }, [demo?.id, open]);

  if (!demo) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <EntityAvatar
              src={demo.logo_url}
              fallbackIcon={<Beaker className="h-4 w-4" />}
              fallbackBgColor="bg-amber-500/10"
              fallbackIconColor="text-amber-500"
              size="lg"
            />
            <div>
              <SheetTitle className="text-left">{demo.name}</SheetTitle>
              <p className="text-sm text-muted-foreground">Demo</p>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="notes" className="flex flex-1 flex-col overflow-hidden pt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notes" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2">
              <LinkIcon className="h-4 w-4" />
              Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="mt-4 flex-1 overflow-hidden">
            {workspaceId ? (
              <ProjectNotes projectId={demo.id} workspaceId={workspaceId} className="h-full" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Loading...
              </div>
            )}
          </TabsContent>

          <TabsContent value="resources" className="mt-4 flex-1 overflow-hidden">
            <ProjectResources projectId={demo.id} initialResources={resources} className="h-full" />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
