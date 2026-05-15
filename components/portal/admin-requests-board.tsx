'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Inbox, Paperclip, MessageSquare, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { updateFeatureRequest } from '@/app/actions/client-requests';
import { RequestDetailSheet } from './request-detail-sheet';

type RequestStatus = 'pending' | 'in_progress' | 'completed';

interface FeatureRequest {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  attachments?:
    | { name: string; path: string; size: number; type: string; uploaded_at: string }[]
    | null;
  project: { id: string; name: string } | null;
  assigned_to?: string | null;
  assignee?: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

interface StaffOption {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface AdminRequestsBoardProps {
  requests: FeatureRequest[];
  commentCounts?: Record<string, number>;
  currentUserId: string;
  userRole: string;
  staffOptions?: StaffOption[];
}

const COLUMNS: { key: RequestStatus; label: string; eyebrow: string }[] = [
  { key: 'pending', label: 'Pending', eyebrow: 'Inbox' },
  { key: 'in_progress', label: 'In Progress', eyebrow: 'Working' },
  { key: 'completed', label: 'Completed', eyebrow: 'Done' },
];

/** Map any DB status to one of the 3 UI columns (or 'archived' for off-board). */
function toUiStatus(dbStatus: string): RequestStatus | 'archived' {
  if (dbStatus === 'declined') return 'archived';
  if (dbStatus === 'in_review' || dbStatus === 'pending') return 'pending';
  if (dbStatus === 'planned' || dbStatus === 'in_progress') return 'in_progress';
  if (dbStatus === 'completed') return 'completed';
  return 'pending'; // unknown values fallback
}

export function AdminRequestsBoard({
  requests,
  commentCounts = {},
  currentUserId,
  userRole,
  staffOptions = [],
}: AdminRequestsBoardProps) {
  const router = useRouter();
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [openRequestId, setOpenRequestId] = useState<string | null>(null);

  // Optimistic status overrides so the card lands in the dropped column before the
  // server round-trip completes. Rolled back if the action fails.
  const [optimisticStatus, setOptimisticStatus] = useState<Partial<Record<string, RequestStatus>>>(
    {}
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const visibleRequests = useMemo(() => {
    return requests.filter((r) => {
      // Use optimistic status for filtering if present, otherwise derive from DB
      const uiStatus = r.id in optimisticStatus ? optimisticStatus[r.id] : toUiStatus(r.status);
      // Hide archived requests from the board
      if (uiStatus === 'archived') return false;
      // Scope filter
      if (scope === 'mine' && r.assigned_to !== currentUserId) return false;
      return true;
    });
  }, [requests, optimisticStatus, scope, currentUserId]);

  const grouped = useMemo(() => {
    const groups: Record<RequestStatus, FeatureRequest[]> = {
      pending: [],
      in_progress: [],
      completed: [],
    };
    for (const r of visibleRequests) {
      const resolved = r.id in optimisticStatus ? optimisticStatus[r.id] : toUiStatus(r.status);
      if (resolved === 'archived') continue;
      const col = resolved as RequestStatus;
      if (groups[col]) groups[col].push(r);
    }
    return groups;
  }, [visibleRequests, optimisticStatus]);

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveDragId(String(e.active.id));
  }, []);

  const handleDragEnd = useCallback(
    async (e: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = e;
      if (!over) return;
      const requestId = String(active.id);
      const newStatus = String(over.id) as RequestStatus;

      const sourceRequest = requests.find((r) => r.id === requestId);
      if (!sourceRequest) return;
      const currentUiStatus = optimisticStatus[requestId] ?? toUiStatus(sourceRequest.status);
      if (currentUiStatus === newStatus) return;

      // Optimistic update
      setOptimisticStatus((prev) => ({ ...prev, [requestId]: newStatus }));

      const result = await updateFeatureRequest(requestId, { status: newStatus });
      if (!result.success) {
        // Rollback
        setOptimisticStatus((prev) => {
          const next = { ...prev };
          delete next[requestId];
          return next;
        });
        toast.error(result.error || 'Failed to update status');
        return;
      }

      toast.success(`Moved to ${COLUMNS.find((c) => c.key === newStatus)?.label ?? newStatus}`);
      router.refresh();
    },
    [requests, optimisticStatus, router]
  );

  const activeRequest = activeDragId
    ? (visibleRequests.find((r) => r.id === activeDragId) ?? null)
    : null;

  const openRequest = openRequestId ? (requests.find((r) => r.id === openRequestId) ?? null) : null;

  const handleCardClick = useCallback((id: string) => {
    setOpenRequestId(id);
  }, []);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* All / Mine toggle */}
      <div className="flex items-center">
        <div className="flex gap-1 rounded-md bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => setScope('all')}
            className={cn(
              'rounded px-3 py-1.5 text-sm transition-colors',
              scope === 'all'
                ? 'bg-background font-medium text-foreground shadow-elevation-1'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setScope('mine')}
            className={cn(
              'rounded px-3 py-1.5 text-sm transition-colors',
              scope === 'mine'
                ? 'bg-background font-medium text-foreground shadow-elevation-1'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Mine
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div
          className="-mx-1 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-1 pb-2 sm:snap-none"
          role="region"
          aria-label="Requests pipeline"
        >
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.key}
              status={col.key}
              label={col.label}
              eyebrow={col.eyebrow}
              count={grouped[col.key].length}
              requests={grouped[col.key]}
              commentCounts={commentCounts}
              onCardClick={handleCardClick}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeRequest ? (
            <RequestCard
              request={activeRequest}
              commentCount={commentCounts[activeRequest.id] ?? 0}
              draggable={false}
              isDragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <RequestDetailSheet
        request={openRequest}
        userRole={userRole}
        currentUserId={currentUserId}
        onClose={() => setOpenRequestId(null)}
        staffOptions={staffOptions}
      />
    </div>
  );
}

/* ─── Column ───────────────────────────────────────────────────────────── */

function KanbanColumn({
  status,
  label,
  eyebrow,
  count,
  requests,
  commentCounts,
  onCardClick,
}: {
  status: RequestStatus;
  label: string;
  eyebrow: string;
  count: number;
  requests: FeatureRequest[];
  commentCounts: Record<string, number>;
  onCardClick: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-[280px] shrink-0 snap-start flex-col rounded-2xl border border-border/70 bg-card/40 p-3 transition-colors sm:w-[300px]',
        isOver && 'border-primary/40 bg-primary/[0.04]'
      )}
    >
      <header className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="min-w-0">
          <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/80">
            {eyebrow}
          </div>
          <div className="mt-0.5 text-sm font-semibold tracking-tight text-foreground">{label}</div>
        </div>
        <Badge
          variant="outline"
          className="h-5 shrink-0 rounded-full border-border/70 bg-card px-1.5 text-[10px] font-medium tabular-nums text-muted-foreground"
        >
          {count}
        </Badge>
      </header>

      <div className="flex max-h-[calc(100vh-280px)] min-h-[200px] flex-col gap-2 overflow-y-auto">
        {requests.length === 0 ? (
          <div
            className={cn(
              'flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 px-3 pb-4 pt-6 text-center',
              isOver && 'border-primary/40'
            )}
          >
            <Inbox
              className={cn('h-6 w-6 text-muted-foreground/25', isOver && 'text-primary/50')}
            />
            <span
              className={cn('text-[11px] text-muted-foreground/40', isOver && 'text-primary/60')}
            >
              {isOver ? 'Drop here' : 'All clear'}
            </span>
          </div>
        ) : (
          requests.map((r) => (
            <DraggableCard
              key={r.id}
              request={r}
              commentCount={commentCounts[r.id] ?? 0}
              onClick={() => onCardClick(r.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Draggable + Card ─────────────────────────────────────────────────── */

function DraggableCard({
  request,
  commentCount,
  onClick,
}: {
  request: FeatureRequest;
  commentCount: number;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: request.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        'cursor-pointer rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        isDragging && 'opacity-30'
      )}
    >
      <RequestCard request={request} commentCount={commentCount} draggable />
    </div>
  );
}

const RequestCard = memo(function RequestCard({
  request,
  commentCount,
  draggable,
  isDragOverlay,
}: {
  request: FeatureRequest;
  commentCount: number;
  draggable: boolean;
  isDragOverlay?: boolean;
}) {
  const attachmentCount = request.attachments?.length ?? 0;
  return (
    <article
      className={cn(
        'group rounded-xl border bg-card p-3 transition-colors',
        isDragOverlay
          ? 'border-primary/60 shadow-elevation-3 ring-1 ring-primary/20'
          : 'border-border/70 hover:border-primary/30 hover:bg-card/70'
      )}
    >
      <div className="flex items-start gap-2">
        {draggable && (
          <GripVertical
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-opacity group-hover:text-muted-foreground/70"
            aria-hidden
          />
        )}
        <div className="min-w-0 flex-1">
          {/* Project name as primary heading */}
          <p className="text-sm font-semibold leading-snug text-foreground">
            {request.project?.name ?? <span className="text-muted-foreground/50">No project</span>}
          </p>
          {/* Request title as secondary line */}
          <h3 className="mt-0.5 line-clamp-2 text-xs font-normal text-muted-foreground">
            {request.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={request.priority} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground/70">
            <div className="flex min-w-0 items-center gap-2">
              <span className="tabular-nums">
                {new Date(request.created_at).toLocaleDateString()}
              </span>
              <AssigneeChip assignee={request.assignee} />
            </div>
            <div className="flex items-center gap-2">
              {attachmentCount > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <Paperclip className="h-3 w-3" />
                  {attachmentCount}
                </span>
              )}
              {commentCount > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <MessageSquare className="h-3 w-3" />
                  {commentCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
});

function AssigneeChip({ assignee }: { assignee: FeatureRequest['assignee'] }) {
  if (!assignee) {
    return (
      <span className="inline-flex h-4 items-center rounded-full border border-dashed border-muted-foreground/30 px-1.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60">
        unassigned
      </span>
    );
  }
  const initial = (assignee.full_name?.trim()[0] ?? '?').toUpperCase();
  const label = assignee.full_name || 'Assigned';
  return (
    <span
      className="inline-flex items-center gap-1 truncate text-muted-foreground"
      title={`Assigned to ${label}`}
    >
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[9px] font-semibold uppercase text-primary">
        {initial}
      </span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const tone =
    priority === 'urgent'
      ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400'
      : priority === 'high'
        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400'
        : priority === 'medium'
          ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400'
          : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400';
  return (
    <Badge
      variant="outline"
      className={cn('h-5 rounded-full px-1.5 text-[10px] font-medium capitalize', tone)}
    >
      {priority}
    </Badge>
  );
}
