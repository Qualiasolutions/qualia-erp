'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowRight,
  Bell,
  Calendar,
  ClipboardList,
  Loader2,
  Pencil,
  Pin,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  createDashboardNote,
  deleteDashboardNote,
  getDashboardNotes,
  togglePinNote,
  updateDashboardNote,
  type DashboardNote,
  type DashboardNoteKind,
} from '@/app/actions/dashboard-notes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type MeetingSummary = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
};

type NoticeDraft = {
  title: string;
  content: string;
  status: string;
  kind: DashboardNoteKind;
};

type AutomaticNotice = {
  id: string;
  title: string;
  status: string;
  content: string;
  href?: string;
};

const blankDraft: NoticeDraft = {
  title: '',
  content: '',
  status: 'Watching',
  kind: 'manual',
};

function draftFromNote(note: DashboardNote): NoticeDraft {
  return {
    title: note.title || 'Untitled notice',
    content: note.content || '',
    status: note.status || 'Notice',
    kind: note.kind || 'manual',
  };
}

function formatMeetingTime(meeting: MeetingSummary) {
  const start = new Date(meeting.start_time);
  const end = new Date(meeting.end_time);
  const fmt = (date: Date) =>
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${fmt(start)}-${fmt(end)}`;
}

function buildAutomaticNotices(meetings: MeetingSummary[], openRequestsCount: number) {
  const notices: AutomaticNotice[] = [];

  if (meetings.length > 0) {
    const nextMeeting = meetings[0];
    notices.push({
      id: 'meetings-today',
      title: meetings.length === 1 ? '1 meeting today' : `${meetings.length} meetings today`,
      status: formatMeetingTime(nextMeeting),
      content:
        meetings.length === 1
          ? nextMeeting.title
          : `Next: ${nextMeeting.title}. ${meetings.length - 1} more after that.`,
      href: '/schedule',
    });
  } else {
    notices.push({
      id: 'meetings-clear',
      title: 'No meetings today',
      status: 'Calendar',
      content: 'Calendar is clear for today.',
      href: '/schedule',
    });
  }

  notices.push({
    id: 'open-requests',
    title: openRequestsCount === 1 ? '1 open request' : `${openRequestsCount} open requests`,
    status: openRequestsCount > 0 ? 'Needs review' : 'Clear',
    content:
      openRequestsCount > 0
        ? 'Client request queue has items waiting.'
        : 'No open client requests right now.',
    href: '/requests',
  });

  return notices;
}

function NoticeKindToggle({
  value,
  onChange,
}: {
  value: DashboardNoteKind;
  onChange: (value: DashboardNoteKind) => void;
}) {
  return (
    <div className="grid w-full grid-cols-2 rounded-lg border border-border bg-background p-1 sm:w-56">
      {(['manual', 'automatic'] as const).map((kind) => (
        <button
          key={kind}
          type="button"
          onClick={() => onChange(kind)}
          className={cn(
            'h-8 rounded-md px-3 text-xs font-medium capitalize transition-colors',
            value === kind
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {kind}
        </button>
      ))}
    </div>
  );
}

function NoticeEditor({
  draft,
  onChange,
  onCancel,
  onSubmit,
  submitLabel,
  pending,
}: {
  draft: NoticeDraft;
  onChange: (draft: NoticeDraft) => void;
  onCancel?: () => void;
  onSubmit: () => void;
  submitLabel: string;
  pending: boolean;
}) {
  const canSubmit = draft.title.trim() && draft.content.trim() && draft.status.trim();

  return (
    <div className="rounded-lg border border-border bg-background/70 p-3">
      <div className="grid gap-3 md:grid-cols-[1fr_180px]">
        <Input
          value={draft.title}
          onChange={(event) => onChange({ ...draft, title: event.target.value })}
          placeholder="Title"
          className="h-10 rounded-lg bg-card"
        />
        <Input
          value={draft.status}
          onChange={(event) => onChange({ ...draft, status: event.target.value })}
          placeholder="Status"
          className="h-10 rounded-lg bg-card"
        />
      </div>
      <Textarea
        value={draft.content}
        onChange={(event) => onChange({ ...draft, content: event.target.value })}
        placeholder="Text"
        className="mt-3 min-h-24 resize-none rounded-lg bg-card"
      />
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <NoticeKindToggle value={draft.kind} onChange={(kind) => onChange({ ...draft, kind })} />
        <div className="flex justify-end gap-2">
          {onCancel ? (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="gap-2">
              <X className="size-3.5" />
              Cancel
            </Button>
          ) : null}
          <Button type="button" size="sm" onClick={onSubmit} disabled={!canSubmit || pending}>
            {pending ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null}
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SavedNoticeRow({
  note,
  editing,
  editingDraft,
  pending,
  onEdit,
  onEditDraft,
  onSave,
  onCancel,
  onDelete,
  onTogglePin,
}: {
  note: DashboardNote;
  editing: boolean;
  editingDraft: NoticeDraft;
  pending: boolean;
  onEdit: () => void;
  onEditDraft: (draft: NoticeDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  if (editing) {
    return (
      <NoticeEditor
        draft={editingDraft}
        onChange={onEditDraft}
        onCancel={onCancel}
        onSubmit={onSave}
        submitLabel="Save"
        pending={pending}
      />
    );
  }

  const updatedAt = note.updated_at
    ? formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })
    : null;

  return (
    <div
      className={cn(
        'group rounded-lg border p-3 transition-colors',
        note.pinned ? 'border-primary/30 bg-primary/[0.04]' : 'border-border bg-background/60'
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onTogglePin}
          aria-label={note.pinned ? 'Unpin notice' : 'Pin notice'}
          className={cn(
            'mt-0.5 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors',
            note.pinned
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground'
          )}
        >
          <Pin className="size-3.5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 break-words text-sm font-semibold leading-snug">
              {note.title || 'Untitled notice'}
            </h3>
            <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px]">
              {note.status || 'Notice'}
            </Badge>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
            {note.content}
          </p>
          {updatedAt ? (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">
              {updatedAt}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit notice"
            className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete notice"
            className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function OwnerNoticeBoard({
  meetings,
  openRequestsCount,
}: {
  meetings: MeetingSummary[];
  openRequestsCount: number;
}) {
  const [notes, setNotes] = useState<DashboardNote[]>([]);
  const [draft, setDraft] = useState<NoticeDraft>(blankDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<NoticeDraft>(blankDraft);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const refreshNotes = useCallback(async () => {
    try {
      const data = await getDashboardNotes();
      setNotes(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load dashboard notices');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getDashboardNotes();
        if (!cancelled) setNotes(data);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to load dashboard notices');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('owner-dashboard-notices')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dashboard_notes',
        },
        () => {
          void refreshNotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshNotes]);

  const manualNotes = useMemo(
    () => notes.filter((note) => (note.kind || 'manual') === 'manual'),
    [notes]
  );
  const savedAutomaticNotes = useMemo(
    () => notes.filter((note) => note.kind === 'automatic'),
    [notes]
  );
  const automaticNotices = useMemo(
    () => buildAutomaticNotices(meetings, openRequestsCount),
    [meetings, openRequestsCount]
  );

  const handleCreate = () => {
    startTransition(async () => {
      const result = await createDashboardNote(draft);
      if (!result.success) {
        toast.error(result.error || 'Failed to add notice');
        return;
      }
      setDraft(blankDraft);
      await refreshNotes();
      toast.success('Added to dashboard');
    });
  };

  const handleUpdate = (noteId: string) => {
    startTransition(async () => {
      const result = await updateDashboardNote(noteId, editingDraft);
      if (!result.success) {
        toast.error(result.error || 'Failed to update notice');
        return;
      }
      setEditingId(null);
      setEditingDraft(blankDraft);
      await refreshNotes();
      toast.success('Dashboard notice updated');
    });
  };

  const handleDelete = (noteId: string) => {
    startTransition(async () => {
      const result = await deleteDashboardNote(noteId);
      if (!result.success) {
        toast.error(result.error || 'Failed to delete notice');
        return;
      }
      await refreshNotes();
      toast.success('Removed from dashboard');
    });
  };

  const handleTogglePin = (note: DashboardNote) => {
    startTransition(async () => {
      const result = await togglePinNote(note.id, !note.pinned);
      if (!result.success) {
        toast.error(result.error || 'Failed to update pin');
        return;
      }
      await refreshNotes();
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Dashboard board
          </p>
          <h2 className="mt-0.5 text-base font-semibold tracking-tight">Notices</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="rounded-md px-2 py-1 text-xs">
            {manualNotes.length} manual
          </Badge>
          <Badge variant="secondary" className="rounded-md px-2 py-1 text-xs">
            {automaticNotices.length + savedAutomaticNotes.length} automatic
          </Badge>
        </div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-4">
          <NoticeEditor
            draft={draft}
            onChange={setDraft}
            onSubmit={handleCreate}
            submitLabel="Add notice"
            pending={isPending}
          />

          {isLoading ? (
            <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : manualNotes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No manual notices.
            </div>
          ) : (
            <ul className="space-y-2">
              {manualNotes.map((note) => (
                <li key={note.id}>
                  <SavedNoticeRow
                    note={note}
                    editing={editingId === note.id}
                    editingDraft={editingDraft}
                    pending={isPending}
                    onEdit={() => {
                      setEditingId(note.id);
                      setEditingDraft(draftFromNote(note));
                    }}
                    onEditDraft={setEditingDraft}
                    onSave={() => handleUpdate(note.id)}
                    onCancel={() => {
                      setEditingId(null);
                      setEditingDraft(blankDraft);
                    }}
                    onDelete={() => handleDelete(note.id)}
                    onTogglePin={() => handleTogglePin(note)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="min-w-0 space-y-4">
          <div className="rounded-lg border border-border bg-background/60">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Automatic
                </p>
                <h3 className="mt-0.5 text-sm font-semibold">Live signals</h3>
              </div>
              <Bell className="size-4 text-muted-foreground" />
            </div>
            <ul className="divide-y divide-border/60">
              {automaticNotices.map((notice) => (
                <li key={notice.id}>
                  <Link
                    href={notice.href || '#'}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
                      {notice.id.includes('meeting') ? (
                        <Calendar className="size-3.5" />
                      ) : (
                        <ClipboardList className="size-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{notice.title}</p>
                        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                      </div>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-primary">
                        {notice.status}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {notice.content}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {savedAutomaticNotes.length > 0 ? (
            <div className="space-y-2">
              {savedAutomaticNotes.map((note) => (
                <SavedNoticeRow
                  key={note.id}
                  note={note}
                  editing={editingId === note.id}
                  editingDraft={editingDraft}
                  pending={isPending}
                  onEdit={() => {
                    setEditingId(note.id);
                    setEditingDraft(draftFromNote(note));
                  }}
                  onEditDraft={setEditingDraft}
                  onSave={() => handleUpdate(note.id)}
                  onCancel={() => {
                    setEditingId(null);
                    setEditingDraft(blankDraft);
                  }}
                  onDelete={() => handleDelete(note.id)}
                  onTogglePin={() => handleTogglePin(note)}
                />
              ))}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
