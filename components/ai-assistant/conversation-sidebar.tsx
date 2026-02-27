'use client';

import { useState } from 'react';
import { Plus, X, Trash2, Loader2 } from 'lucide-react';
import { cn, formatTimeAgo } from '@/lib/utils';
import { useConversations, invalidateConversations } from '@/lib/swr';
import { deleteConversation, type Conversation } from '@/app/actions/ai-conversations';
import {
  startOfToday,
  startOfYesterday,
  startOfWeek,
  startOfMonth,
  parseISO,
  isAfter,
  isBefore,
} from 'date-fns';

interface ConversationSidebarProps {
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onClose: () => void;
}

type ConversationGroup = {
  label: string;
  conversations: Conversation[];
};

/**
 * Group conversations by date relative to today
 */
function groupConversationsByDate(conversations: Conversation[]): ConversationGroup[] {
  const today = startOfToday();
  const yesterday = startOfYesterday();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const monthStart = startOfMonth(today);

  const groups: Record<string, Conversation[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    'This Month': [],
    Older: [],
  };

  conversations.forEach((conv) => {
    const updatedAt = parseISO(conv.updated_at);

    if (isAfter(updatedAt, today)) {
      groups['Today'].push(conv);
    } else if (isAfter(updatedAt, yesterday) && isBefore(updatedAt, today)) {
      groups['Yesterday'].push(conv);
    } else if (isAfter(updatedAt, weekStart) && isBefore(updatedAt, yesterday)) {
      groups['This Week'].push(conv);
    } else if (isAfter(updatedAt, monthStart) && isBefore(updatedAt, weekStart)) {
      groups['This Month'].push(conv);
    } else {
      groups['Older'].push(conv);
    }
  });

  // Return only non-empty groups
  return Object.entries(groups)
    .filter(([, convs]) => convs.length > 0)
    .map(([label, convs]) => ({ label, conversations: convs }));
}

/**
 * Individual conversation item with delete button
 */
function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the conversation
    setIsDeleting(true);

    const result = await deleteConversation(conversation.id);
    if (result.success) {
      invalidateConversations(true);
      onDelete();
    } else {
      console.error('Failed to delete conversation:', result.error);
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      className={cn(
        'group relative flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-all',
        isActive
          ? 'bg-primary/10 text-foreground ring-1 ring-primary/20'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{conversation.title}</p>
        <p className="text-[10px] text-muted-foreground">
          {formatTimeAgo(conversation.updated_at)}
        </p>
      </div>

      {/* Delete button - shown on hover */}
      {showDelete && !isDeleting && (
        <button
          onClick={handleDelete}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          aria-label="Delete conversation"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}

      {/* Loading spinner while deleting */}
      {isDeleting && (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center">
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        </div>
      )}
    </button>
  );
}

/**
 * Conversation history sidebar for AI assistant
 * Shows past conversations grouped by date with ability to switch, delete, and create new
 */
export function ConversationSidebar({
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onClose,
}: ConversationSidebarProps) {
  const { conversations, isLoading } = useConversations();

  const handleDelete = () => {
    // If the deleted conversation was active, callback will handle state update
    if (activeConversationId) {
      // Parent component should handle clearing active conversation if needed
    }
  };

  const groups = groupConversationsByDate(conversations);
  const isEmpty = conversations.length === 0;

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <h2 className="text-xs font-semibold text-foreground">Conversations</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewConversation}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="New conversation"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <p className="mb-3 text-xs text-muted-foreground">No conversations yet</p>
            <button
              onClick={onNewConversation}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-medium text-primary',
                'transition-colors hover:bg-primary/10'
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              Start a conversation
            </button>
          </div>
        ) : (
          <div className="space-y-4 p-2">
            {groups.map((group) => (
              <div key={group.label} className="space-y-1">
                <h3 className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </h3>
                <div className="space-y-0.5">
                  {group.conversations.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === activeConversationId}
                      onSelect={() => onSelectConversation(conv.id)}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
