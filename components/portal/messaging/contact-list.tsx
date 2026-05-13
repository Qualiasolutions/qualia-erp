'use client';

import { useState, useMemo } from 'react';
import { Search, MessageSquare } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { usePresence } from '@/components/portal/presence-broadcaster';
import { useProfiles } from '@/lib/swr';
import { cn } from '@/lib/utils';

const OWNER_EMAIL = 'info@qualiasolutions.net';

export interface NormalizedChannel {
  id: string;
  projectId: string;
  project: { id: string; name: string; project_type: string; status?: string | null } | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  lastMessageSender?: { id: string; full_name: string | null } | null;
  unreadCount: number;
}

interface ContactEntry {
  contactId: string;
  channelId: string;
  projectId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  lastMessageSenderName: string | null;
  unreadCount: number;
  isOwner: boolean;
  isOnline: boolean;
}

interface ContactListProps {
  userId: string;
  channels: NormalizedChannel[];
  onSelectContact: (contactId: string, projectId: string, channelId: string) => void;
  selectedContactId: string | null;
}

export function ContactList({
  userId,
  channels,
  onSelectContact,
  selectedContactId,
}: ContactListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const presenceEntries = usePresence();
  const { profiles } = useProfiles();

  void userId;

  const onlineUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of presenceEntries) {
      ids.add(entry.user_id);
    }
    return ids;
  }, [presenceEntries]);

  const profilesByIdMap = useMemo(() => {
    const map = new Map<
      string,
      { id: string; full_name: string | null; email: string | null; avatar_url: string | null }
    >();
    for (const profile of profiles) {
      map.set(profile.id, profile);
    }
    return map;
  }, [profiles]);

  const ownerProfileId = useMemo(() => {
    for (const profile of profiles) {
      if (profile.email === OWNER_EMAIL) {
        return profile.id;
      }
    }
    return null;
  }, [profiles]);

  const contacts: ContactEntry[] = useMemo(() => {
    const entries: ContactEntry[] = [];

    for (const channel of channels) {
      const projectName = channel.project?.name || 'Unknown Project';
      const senderId = channel.lastMessageSender?.id || null;
      const senderProfile = senderId ? profilesByIdMap.get(senderId) : null;

      const contactId = channel.projectId;
      const contactEmail = senderProfile?.email || null;
      const contactAvatarUrl = senderProfile?.avatar_url || null;

      const isOwner = ownerProfileId ? senderId === ownerProfileId : contactEmail === OWNER_EMAIL;

      const isOnline = senderId ? onlineUserIds.has(senderId) : false;

      entries.push({
        contactId,
        channelId: channel.id,
        projectId: channel.projectId,
        name: projectName,
        email: contactEmail,
        avatarUrl: contactAvatarUrl,
        lastMessagePreview: channel.lastMessagePreview || null,
        lastMessageAt: channel.lastMessageAt || null,
        lastMessageSenderName: channel.lastMessageSender?.full_name || null,
        unreadCount: channel.unreadCount,
        isOwner,
        isOnline,
      });
    }

    // If the owner profile exists but there's no channel with the owner as last sender,
    // we do NOT fabricate a standalone entry — the owner row is purely a styling + pin
    // applied to the channel where the owner participated last. If there's no such
    // channel, the owner doesn't appear (nothing to open).

    // Sort: owner first, then online alphabetically, then offline alphabetically
    entries.sort((a, b) => {
      if (a.isOwner && !b.isOwner) return -1;
      if (!a.isOwner && b.isOwner) return 1;
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return a.name.localeCompare(b.name);
    });

    return entries;
  }, [channels, profilesByIdMap, ownerProfileId, onlineUserIds]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.lastMessageSenderName && c.lastMessageSenderName.toLowerCase().includes(q))
    );
  }, [contacts, searchQuery]);

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="shrink-0 px-4 pb-3 pt-5">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
          Team &amp; Clients
        </div>
        <h2 className="mt-1 text-base font-semibold tracking-tight text-foreground">Contacts</h2>
      </div>

      {/* Search */}
      <div className="shrink-0 px-3 pb-3 pt-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3',
              'text-sm text-foreground placeholder:text-muted-foreground',
              'focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30',
              'transition-colors duration-150'
            )}
            aria-label="Search contacts"
          />
        </div>
      </div>

      {/* Contact rows */}
      <div className="flex-1 overflow-y-auto px-2 pb-3" role="listbox" aria-label="Contacts">
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-semibold tracking-tight text-foreground">
              {searchQuery.trim() ? 'No matches' : 'No conversations yet'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {searchQuery.trim()
                ? 'Try a different search term.'
                : 'Start a thread on any of your projects.'}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredContacts.map((contact) => {
              const isSelected = contact.contactId === selectedContactId;
              const initials = getInitials(contact.name);
              const timeAgo = contact.lastMessageAt
                ? formatRelativeTime(contact.lastMessageAt)
                : null;

              return (
                <button
                  key={contact.contactId}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() =>
                    onSelectContact(contact.contactId, contact.projectId, contact.channelId)
                  }
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150',
                    contact.isOwner && 'border-l-2 border-primary bg-primary/[0.08]',
                    !contact.isOwner && isSelected && 'bg-primary/[0.1]',
                    !contact.isOwner && !isSelected && 'hover:bg-muted/30'
                  )}
                >
                  {/* Avatar with presence dot */}
                  <div className="relative shrink-0">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full',
                        contact.isOwner
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted/60 text-muted-foreground'
                      )}
                    >
                      <span
                        className={cn(
                          'text-[11px] font-semibold leading-none',
                          !contact.isOwner && 'font-medium'
                        )}
                      >
                        {initials}
                      </span>
                    </div>
                    {/* Presence dot — NOT rendered for owner */}
                    {!contact.isOwner && (
                      <span
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-card',
                          contact.isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/25'
                        )}
                        aria-label={contact.isOnline ? 'Online' : 'Offline'}
                      />
                    )}
                  </div>

                  {/* Name + preview */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          'truncate text-[13px]',
                          contact.isOwner
                            ? 'font-semibold text-primary'
                            : contact.unreadCount > 0
                              ? 'font-semibold text-foreground'
                              : 'font-medium text-foreground'
                        )}
                      >
                        {contact.name}
                      </p>
                      {timeAgo && (
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          {timeAgo}
                        </span>
                      )}
                    </div>
                    {contact.lastMessagePreview && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {contact.lastMessageSenderName ? `${contact.lastMessageSenderName}: ` : ''}
                        {contact.lastMessagePreview}
                      </p>
                    )}
                  </div>

                  {/* Unread badge */}
                  {contact.unreadCount > 0 && (
                    <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-bold text-primary-foreground">
                      {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] || '?').toUpperCase();
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    return formatDistanceToNow(date, { addSuffix: false })
      .replace('about ', '')
      .replace('less than a minute', 'now')
      .replace(' minutes', 'm')
      .replace(' minute', 'm')
      .replace(' hours', 'h')
      .replace(' hour', 'h')
      .replace(' days', 'd')
      .replace(' day', 'd')
      .replace(' months', 'mo')
      .replace(' month', 'mo');
  } catch {
    return '';
  }
}
