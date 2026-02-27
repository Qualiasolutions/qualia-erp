'use client';

import { useProfiles } from '@/lib/swr';
import { AdminNotesPanel } from './admin-notes-panel';

/**
 * Admin section showing note panels for all team members
 * Only renders for admin users (visibility controlled by parent)
 */
export function AdminNotesSection({ currentUserId }: { currentUserId: string }) {
  const { profiles, isLoading } = useProfiles();

  // Show panels for all team members except the current admin
  const teamMembers = profiles.filter((p) => p.id !== currentUserId);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-32 rounded-lg bg-muted" />
        <div className="h-32 rounded-lg bg-muted" />
      </div>
    );
  }

  if (teamMembers.length === 0) {
    return <p className="text-sm text-muted-foreground">No other team members found.</p>;
  }

  return (
    <div className="space-y-4">
      {teamMembers.map((member) => (
        <AdminNotesPanel
          key={member.id}
          targetUserId={member.id}
          targetUserName={member.full_name || member.email || 'Unknown'}
        />
      ))}
    </div>
  );
}
