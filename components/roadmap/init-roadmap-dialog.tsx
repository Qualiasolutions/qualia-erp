'use client';

import { useState } from 'react';
import { Bot, Globe, Search, Megaphone, Loader2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getAllProjectTypes, countTemplateItems, type ProjectType } from '@/lib/phase-templates';

interface InitRoadmapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectType: ProjectType | null;
  onSelect: (type: ProjectType) => void;
  loading?: boolean;
}

const TYPE_ICONS: Record<ProjectType, typeof Bot> = {
  ai_agent: Bot,
  web_design: Globe,
  seo: Search,
  ads: Megaphone,
};

export function InitRoadmapDialog({
  open,
  onOpenChange,
  projectType,
  onSelect,
  loading,
}: InitRoadmapDialogProps) {
  const [selected, setSelected] = useState<ProjectType | null>(projectType);
  const projectTypes = getAllProjectTypes();

  function handleConfirm() {
    if (selected) {
      onSelect(selected);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Initialize Project Roadmap</DialogTitle>
          <DialogDescription>
            Select a project type to create a pre-defined roadmap with phases and tasks.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4">
          {/* Start Blank option */}
          <button
            onClick={() => onOpenChange(false)}
            className="flex flex-col items-start gap-2 rounded-lg border border-border p-4 text-left transition-colors hover:border-muted-foreground/50 hover:bg-muted/50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium">Start Blank</h3>
              <p className="text-xs text-muted-foreground">Create your own phases</p>
            </div>
          </button>

          {/* Template options */}
          {projectTypes.map((config) => {
            const Icon = TYPE_ICONS[config.projectType];
            const itemCount = countTemplateItems(config.phases);
            const isSelected = selected === config.projectType;

            return (
              <button
                key={config.projectType}
                onClick={() => setSelected(config.projectType)}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors',
                  isSelected
                    ? 'border-qualia-500 bg-qualia-500/10'
                    : 'border-border hover:border-qualia-500/50 hover:bg-muted/50'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    isSelected ? 'bg-qualia-500/20' : 'bg-muted'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5',
                      isSelected ? 'text-qualia-500' : 'text-muted-foreground'
                    )}
                  />
                </div>
                <div>
                  <h3 className="font-medium">{config.label}</h3>
                  <p className="text-xs text-muted-foreground">
                    {config.phases.length} phases, {itemCount} tasks
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selected || loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Initialize Roadmap
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
