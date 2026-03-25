'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Wand2, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getClients } from '@/app/actions';
import { useWorkspace } from '@/components/workspace-provider';
import { useAIAssistant } from '@/components/ai-assistant';

// Lazy load ProjectWizard - 951 lines, only needed when creating projects
const ProjectWizard = dynamic(
  () => import('@/components/project-wizard').then((mod) => mod.ProjectWizard),
  {
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading wizard...</span>
        </div>
      </div>
    ),
    ssr: false,
  }
);

interface Client {
  id: string;
  display_name: string | null;
  business_name?: string | null;
}

export function NewProjectModal() {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const { currentWorkspace } = useWorkspace();
  const { startGuidedTask } = useAIAssistant();

  useEffect(() => {
    if (open && currentWorkspace) {
      // Fetch clients for current workspace
      getClients(currentWorkspace.id).then((result) => {
        if (Array.isArray(result)) {
          setClients(result);
        }
      });
    }
  }, [open, currentWorkspace]);

  const handleAICreate = () => {
    startGuidedTask('create-project');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="flex items-center gap-2 bg-primary hover:bg-primary">
            <Plus className="h-4 w-4" />
            <span>New Project</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Use Form Wizard
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAICreate}>
            <Wand2 className="mr-2 h-4 w-4" />
            Ask AI Assistant
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProjectWizard open={open} onOpenChange={setOpen} clients={clients} />
    </>
  );
}
