'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  HelpCircle,
  CheckCircle2,
  Circle,
  Clock,
  SkipForward,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PhaseItem } from './phase-item';
import { AddItemDialog } from './add-item-dialog';
import { updatePhase, deletePhase } from '@/app/actions';
import { cn } from '@/lib/utils';
import type { PhaseData } from './project-roadmap';

interface PhaseCardProps {
  phase: PhaseData;
  phaseNumber: number;
  projectId: string;
  onUpdate: () => void;
}

const STATUS_CONFIG = {
  not_started: {
    label: 'Not Started',
    icon: Circle,
    className: 'border-slate-500/20 bg-slate-500/10 text-slate-400',
  },
  in_progress: {
    label: 'In Progress',
    icon: Clock,
    className: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    className: 'border-green-500/20 bg-green-500/10 text-green-400',
  },
  skipped: {
    label: 'Skipped',
    icon: SkipForward,
    className: 'border-gray-500/20 bg-gray-500/10 text-gray-400',
  },
};

export function PhaseCard({ phase, phaseNumber, projectId, onUpdate }: PhaseCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const statusConfig = STATUS_CONFIG[phase.status] || STATUS_CONFIG.not_started;
  const StatusIcon = statusConfig.icon;

  async function handleStatusChange(newStatus: string) {
    const formData = new FormData();
    formData.set('id', phase.id);
    formData.set('status', newStatus);
    await updatePhase(formData);
    onUpdate();
  }

  async function handleDelete() {
    setIsDeleting(true);
    await deletePhase(phase.id);
    setShowDeleteDialog(false);
    onUpdate();
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Phase Header */}
      <div
        className="flex cursor-pointer items-center gap-3 p-4 hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button
          type="button"
          className="text-muted-foreground"
          aria-label={isExpanded ? 'Collapse phase' : 'Expand phase'}
          aria-expanded={isExpanded}
        >
          {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-qualia-500/10 text-sm font-medium text-qualia-400">
          {phaseNumber}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium">{phase.name}</h3>
            {phase.helper_text && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{phase.helper_text}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {phase.description && (
            <p className="truncate text-sm text-muted-foreground">{phase.description}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Progress */}
          <div className="hidden items-center gap-2 sm:flex" style={{ minWidth: '100px' }}>
            <Progress value={phase.progress} className="h-2 flex-1" />
            <span className="w-8 text-xs text-muted-foreground">{phase.progress}%</span>
          </div>

          {/* Status Badge */}
          <Badge variant="outline" className={cn('text-xs', statusConfig.className)}>
            <StatusIcon className="mr-1 h-3 w-3" />
            {statusConfig.label}
          </Badge>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Phase actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleStatusChange('in_progress')}>
                <Clock className="mr-2 h-4 w-4" />
                Mark In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mark Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('skipped')}>
                <SkipForward className="mr-2 h-4 w-4" />
                Skip Phase
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-500 focus:text-red-500"
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Phase
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Phase
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{phase.name}&rdquo;? This will also delete all{' '}
              {phase.items?.length || 0} items in this phase. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Phase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phase Items */}
      {isExpanded && (
        <div className="border-t border-border">
          <div className="grid grid-cols-1 gap-1 p-2 sm:grid-cols-2 lg:grid-cols-3">
            {phase.items?.map((item) => (
              <PhaseItem key={item.id} item={item} projectId={projectId} onUpdate={onUpdate} />
            ))}
          </div>

          {/* Add Item */}
          <div className="px-4 pb-4">
            <AddItemDialog
              phaseId={phase.id}
              projectId={projectId}
              onSuccess={onUpdate}
              nextOrder={phase.items?.length || 0}
            />
          </div>
        </div>
      )}
    </div>
  );
}
