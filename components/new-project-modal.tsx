'use client';

import { useState, useEffect } from 'react';
import { Plus, Wand2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProjectWizard } from '@/components/project-wizard';
import { getClients } from '@/app/actions';
import { useWorkspace } from '@/components/workspace-provider';
import { useAIAssistant } from '@/components/ai-assistant';

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
          <Button className="flex items-center gap-2 bg-qualia-600 hover:bg-qualia-500">
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
