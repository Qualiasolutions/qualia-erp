'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useTeamStatus } from '@/lib/swr';
import { SessionHistoryPanel } from './session-history-panel';

// ============ TYPES ============

interface LiveStatusPanelProps {
  workspaceId: string;
}

// ============ HELPERS ============

function getInitials(fullName: string | null): string {
  if (!fullName) return '?';
  return fullName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ============ MAIN COMPONENT ============

export function LiveStatusPanel({ workspaceId }: LiveStatusPanelProps) {
  const { members, isLoading } = useTeamStatus(workspaceId);
  const [selectedMember, setSelectedMember] = useState<{
    profileId: string;
    profileName: string;
  } | null>(null);

  const clockedIn = members.filter((m) => m.status === 'online');
  const clockedOut = members.filter((m) => m.status === 'offline');

  if (selectedMember) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <SessionHistoryPanel
          workspaceId={workspaceId}
          profileId={selectedMember.profileId}
          profileName={selectedMember.profileName}
          onClose={() => setSelectedMember(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
      {isLoading ? (
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="size-7 rounded-full" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <p className="text-xs text-muted-foreground/50">No team members</p>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex cursor-default items-center gap-3">
              {/* Compact avatar row */}
              <div className="flex items-center -space-x-1.5">
                {[...clockedIn, ...clockedOut].map((member) => {
                  const isClockedIn = member.status === 'online';
                  return (
                    <button
                      key={member.profileId}
                      type="button"
                      onClick={() =>
                        setSelectedMember({
                          profileId: member.profileId,
                          profileName: member.fullName ?? 'Unknown',
                        })
                      }
                      className="group relative transition-transform duration-150 hover:z-10 hover:scale-110"
                    >
                      <Avatar className="size-7 ring-2 ring-card">
                        {member.avatarUrl && (
                          <AvatarImage src={member.avatarUrl} alt={member.fullName ?? undefined} />
                        )}
                        <AvatarFallback
                          className={cn(
                            'text-[10px] font-semibold',
                            isClockedIn
                              ? 'bg-primary/15 text-primary'
                              : 'bg-muted/60 text-muted-foreground/50'
                          )}
                        >
                          {getInitials(member.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 block size-2.5 rounded-full ring-2 ring-card',
                          isClockedIn ? 'bg-primary' : 'bg-muted-foreground/25'
                        )}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Summary text */}
              <div className="min-w-0 flex-1">
                {clockedIn.length > 0 ? (
                  <p className="truncate text-xs text-muted-foreground">
                    <span className="font-medium text-primary">
                      {clockedIn.map((m) => m.fullName?.split(' ')[0]).join(', ')}
                    </span>{' '}
                    clocked in
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground/50">No one clocked in</p>
                )}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end" className="max-w-xs p-0">
            <div className="space-y-0.5 px-1 py-1.5">
              {clockedIn.length > 0 && (
                <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-background/50">
                  Online — {clockedIn.length}
                </p>
              )}
              {clockedIn.map((m) => (
                <div key={m.profileId} className="flex items-center gap-2 rounded px-2 py-1">
                  <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" />
                  <span className="font-medium">{m.fullName ?? 'Unknown'}</span>
                  {(m.projectName || m.clockInNote) && (
                    <span className="truncate text-background/50">
                      — {m.projectName || m.clockInNote}
                    </span>
                  )}
                </div>
              ))}
              {clockedOut.length > 0 && (
                <p className="px-2 pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-wider text-background/50">
                  Offline — {clockedOut.length}
                </p>
              )}
              {clockedOut.map((m) => (
                <div key={m.profileId} className="flex items-center gap-2 rounded px-2 py-1">
                  <span className="size-1.5 shrink-0 rounded-full bg-background/25" />
                  <span className="text-background/60">{m.fullName ?? 'Unknown'}</span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
