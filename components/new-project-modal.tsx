'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectWizard } from '@/components/project-wizard';
import { getClients } from '@/app/actions';
import { useWorkspace } from '@/components/workspace-provider';

interface Client {
  id: string;
  display_name: string | null;
}

export function NewProjectModal() {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const { currentWorkspace } = useWorkspace();

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

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-qualia-600 hover:bg-qualia-500"
      >
        <Plus className="h-4 w-4" />
        <span>New Project</span>
      </Button>

      <ProjectWizard open={open} onOpenChange={setOpen} clients={clients} />
    </>
  );
}
