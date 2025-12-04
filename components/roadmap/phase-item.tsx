'use client';

import { useState } from 'react';
import { Link2, HelpCircle, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { togglePhaseItem, deletePhaseItem } from '@/app/actions';
import { LinkIssueDialog } from './link-issue-dialog';
import { EditItemDialog } from './edit-item-dialog';
import { cn } from '@/lib/utils';
import type { PhaseItemData } from './project-roadmap';

interface PhaseItemProps {
  item: PhaseItemData;
  projectId: string;
  onUpdate: () => void;
}

export function PhaseItem({ item, projectId, onUpdate }: PhaseItemProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  async function handleToggle() {
    setIsToggling(true);
    await togglePhaseItem(item.id);
    onUpdate();
    setIsToggling(false);
  }

  async function handleDelete() {
    if (!confirm('Delete this item?')) return;
    await deletePhaseItem(item.id);
    onUpdate();
  }

  return (
    <>
      <div
        className={cn(
          'group flex items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50',
          item.is_completed && 'opacity-60'
        )}
      >
        {/* Checkbox */}
        <Checkbox
          checked={item.is_completed}
          onCheckedChange={handleToggle}
          disabled={isToggling}
          className="mt-0.5"
        />

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn('text-sm', item.is_completed && 'text-muted-foreground line-through')}
            >
              {item.title}
            </span>
            {item.helper_text && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{item.helper_text}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Linked Issue */}
          {item.linked_issue && (
            <div className="mt-1 inline-flex items-center gap-1 text-xs text-qualia-400">
              <Link2 className="h-3 w-3" />
              <span>{item.linked_issue.title}</span>
              <span className="rounded bg-muted px-1 py-0.5 text-[10px]">
                {item.linked_issue.status}
              </span>
            </div>
          )}

          {/* Completed by */}
          {item.is_completed && item.completed_by_profile && (
            <p className="mt-1 text-xs text-muted-foreground">
              Completed by {item.completed_by_profile.full_name || 'Unknown'}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setShowLinkDialog(true)}
          >
            <Link2 className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowLinkDialog(true)}>
                <Link2 className="mr-2 h-4 w-4" />
                {item.linked_issue ? 'Change Linked Issue' : 'Link Issue'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-red-500 focus:text-red-500">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <LinkIssueDialog
        open={showLinkDialog}
        onOpenChange={setShowLinkDialog}
        itemId={item.id}
        projectId={projectId}
        currentIssueId={item.linked_issue_id}
        onSuccess={onUpdate}
      />

      <EditItemDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        item={item}
        onSuccess={onUpdate}
      />
    </>
  );
}
