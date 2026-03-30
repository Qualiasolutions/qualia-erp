'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

  const onlineMembers = members.filter((m) => m.status === 'online');
  const offlineMembers = members.filter((m) => m.status === 'offline');

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
        <>
          {/* Compact avatar row */}
          <div className="flex items-center -space-x-1.5">
            {[...onlineMembers, ...offlineMembers].map((member) => {
              const isOnline = member.status === 'online';
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
                  title={`${member.fullName ?? 'Unknown'}${isOnline ? ` — ${member.projectName || 'Working'}` : ' — Offline'}`}
                >
                  <Avatar className="size-7 ring-2 ring-card">
                    {member.avatarUrl && (
                      <AvatarImage src={member.avatarUrl} alt={member.fullName ?? undefined} />
                    )}
                    <AvatarFallback
                      className={cn(
                        'text-[10px] font-semibold',
                        isOnline
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted/60 text-muted-foreground/50'
                      )}
                    >
                      {getInitials(member.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Status dot */}
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 block size-2.5 rounded-full ring-2 ring-card',
                      isOnline
                        ? 'animate-[pulse_3s_cubic-bezier(0.19,1,0.22,1)_infinite] bg-primary'
                        : 'bg-muted-foreground/25'
                    )}
                  />
                </button>
              );
            })}
          </div>

          {/* Summary text */}
          <div className="min-w-0 flex-1">
            {onlineMembers.length > 0 ? (
              <p className="truncate text-xs text-muted-foreground">
                <span className="font-medium text-primary">
                  {onlineMembers.map((m) => m.fullName?.split(' ')[0]).join(', ')}
                </span>{' '}
                online
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/50">Everyone offline</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
