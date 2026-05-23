'use client';

import { useMemo, useState } from 'react';
import { ClipboardCopy, FileInput, Link2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ProjectOption {
  id: string;
  name: string;
}

interface AdminClientFormLinkDialogProps {
  projects: ProjectOption[];
}

export function AdminClientFormLinkDialog({ projects }: AdminClientFormLinkDialogProps) {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? '');

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const formPath = useMemo(() => {
    if (!selectedProjectId) return '';
    return `/projects/${selectedProjectId}?brief=1`;
  }, [selectedProjectId]);

  const copyLink = async () => {
    if (!formPath) return;
    await navigator.clipboard.writeText(`${window.location.origin}${formPath}`);
    toast.success('Client form link copied');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <FileInput className="size-4" />
          Client form
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create client form link</DialogTitle>
          <DialogDescription>
            Pick a project and send the link to the linked client. It opens the project brief form.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <label
              htmlFor="client-form-project"
              className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
            >
              Project
            </label>
            <select
              id="client-form-project"
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              className={cn(
                'mt-2 h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground',
                'focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20'
              )}
            >
              {projects.length === 0 ? (
                <option value="">No projects available</option>
              ) : (
                projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))
              )}
            </select>
            {selectedProject && (
              <p className="mt-2 text-xs text-muted-foreground">
                The client will see the brief flow for {selectedProject.name}.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-background/60 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Link2 className="size-4 text-primary" />
              Fill link
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input readOnly value={formPath || 'Select a project to generate a link'} />
              <Button
                type="button"
                onClick={copyLink}
                disabled={!formPath}
                className="shrink-0 gap-2"
              >
                <ClipboardCopy className="size-4" />
                Copy
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
