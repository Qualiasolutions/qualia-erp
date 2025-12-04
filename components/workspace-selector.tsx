'use client';

import { useState } from 'react';
import { ChevronDown, Check, Lock, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWorkspace, type WorkspaceWithAccess } from '@/components/workspace-provider';
import { cn } from '@/lib/utils';

export function WorkspaceSelector() {
  const { currentWorkspace, workspaces, setCurrentWorkspace, isLoading } = useWorkspace();
  const [accessDeniedWorkspace, setAccessDeniedWorkspace] = useState<WorkspaceWithAccess | null>(
    null
  );
  const [isSwitching, setIsSwitching] = useState(false);

  const handleSelectWorkspace = async (workspace: WorkspaceWithAccess) => {
    if (!workspace.hasAccess) {
      setAccessDeniedWorkspace(workspace);
      return;
    }

    if (workspace.id === currentWorkspace?.id) {
      return; // Already selected
    }

    setIsSwitching(true);
    const success = await setCurrentWorkspace(workspace);
    if (success) {
      // Force full page reload to load data for the new workspace
      window.location.reload();
    } else {
      setIsSwitching(false);
    }
  };

  if (isLoading) {
    return <div className="h-9 w-full animate-pulse rounded-md bg-muted" />;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={isSwitching}
          className={cn(
            'flex w-full items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-qualia-400 focus:ring-offset-2 focus:ring-offset-background',
            isSwitching && 'cursor-wait opacity-70'
          )}
        >
          {isSwitching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="flex-1 truncate text-left text-muted-foreground">Switching...</span>
            </>
          ) : currentWorkspace ? (
            <span className="flex-1 truncate text-left">{currentWorkspace.name}</span>
          ) : (
            <span className="flex-1 truncate text-left text-muted-foreground">
              Select workspace
            </span>
          )}
          {!isSwitching && <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Workspaces
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => handleSelectWorkspace(workspace)}
              className={cn(
                'flex cursor-pointer items-center gap-2',
                currentWorkspace?.id === workspace.id && 'bg-muted',
                !workspace.hasAccess && 'opacity-60'
              )}
            >
              <span className="flex-1 truncate">{workspace.name}</span>
              {!workspace.hasAccess && <Lock className="h-3 w-3 text-muted-foreground" />}
              {currentWorkspace?.id === workspace.id && (
                <Check className="h-4 w-4 text-qualia-400" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Access Denied Dialog */}
      <Dialog open={!!accessDeniedWorkspace} onOpenChange={() => setAccessDeniedWorkspace(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              Access Restricted
            </DialogTitle>
            <DialogDescription className="pt-2">
              You don&apos;t have access to{' '}
              <span className="font-medium text-foreground">{accessDeniedWorkspace?.name}</span>.
              <br />
              <br />
              Contact an administrator to request access to this workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <button
              onClick={() => setAccessDeniedWorkspace(null)}
              className="rounded-md bg-muted px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
