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
import { Paperclip, MessageSquare, Search, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { updateFeatureRequest } from '@/app/actions/client-requests';
import { RequestDetailSheet } from './request-detail-sheet';

type RequestStatus = 'pending' | 'in_review' | 'planned' | 'in_progress' | 'completed' | 'declined';

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
  { key: 'in_review', label: 'In Review', eyebrow: 'Triage' },
  { key: 'planned', label: 'Planned', eyebrow: 'Queued' },
  { key: 'in_progress', label: 'In Progress', eyebrow: 'Working' },
  { key: 'completed', label: 'Completed', eyebrow: 'Done' },
];

const PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const;

function isCancelled(req: FeatureRequest): boolean {
  return req.status === 'declined' && req.admin_response === 'Cancelled by client';
}

export function AdminRequestsBoard({
  requests,
  commentCounts = {},
  currentUserId,
  userRole,
  staffOptions = [],
}: AdminRequestsBoardProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  // Assignee filter: null = all, 'mine' = me, 'unassigned' = unassigned, otherwise user id
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [showDeclined, setShowDeclined] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [openRequestId, setOpenRequestId] = useState<string | null>(null);

  // Optimistic status overrides so the card lands in the dropped column before the
  // server round-trip completes. Rolled back if the action fails.
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, RequestStatus>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const allProjects = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of requests) {
      if (r.project) map.set(r.project.id, r.project.name);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [requests]);

  const visibleRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests
      .map((r) => ({ ...r, status: optimisticStatus[r.id] ?? (r.status as RequestStatus) }))
      .filter((r) => {
        if (priorityFilter && r.priority !== priorityFilter) return false;
        if (projectFilter && r.project?.id !== projectFilter) return false;
        if (assigneeFilter === 'mine' && r.assigned_to !== currentUserId) return false;
        if (assigneeFilter === 'unassigned' && r.assigned_to) return false;
        if (
          assigneeFilter &&
          assigneeFilter !== 'mine' &&
          assigneeFilter !== 'unassigned' &&
          r.assigned_to !== assigneeFilter
        )
          return false;
        if (!q) return true;
        return (
          r.title.toLowerCase().includes(q) ||
          (r.description ?? '').toLowerCase().includes(q) ||
          (r.project?.name ?? '').toLowerCase().includes(q) ||
          (r.assignee?.full_name ?? '').toLowerCase().includes(q)
        );
      });
  }, [
    requests,
    optimisticStatus,
    search,
    priorityFilter,
    projectFilter,
    assigneeFilter,
    currentUserId,
  ]);

  const grouped = useMemo(() => {
    const groups: Record<RequestStatus, FeatureRequest[]> = {
      pending: [],
      in_review: [],
      planned: [],
      in_progress: [],
      completed: [],
      declined: [],
    };
    for (const r of visibleRequests) {
      const status = (r.status as RequestStatus) ?? 'pending';
      if (groups[status]) groups[status].push(r);
    }
    return groups;
  }, [visibleRequests]);

  const declinedCount = grouped.declined.length;

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
      const currentStatus = (optimisticStatus[requestId] ?? sourceRequest.status) as RequestStatus;
      if (currentStatus === newStatus) return;

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

  const openRequest = openRequestId
    ? (visibleRequests.find((r) => r.id === openRequestId) ?? null)
    : null;

  const handleCardClick = useCallback((id: string) => {
    setOpenRequestId(id);
  }, []);

  return (
    <div className="flex h-full flex-col gap-4">
      <BoardToolbar
        search={search}
        onSearch={setSearch}
        priority={priorityFilter}
        onPriority={setPriorityFilter}
        project={projectFilter}
        onProject={setProjectFilter}
        projects={allProjects}
        declinedCount={declinedCount}
        showDeclined={showDeclined}
        onToggleDeclined={() => setShowDeclined((v) => !v)}
        assignee={assigneeFilter}
        onAssignee={setAssigneeFilter}
        staffOptions={staffOptions}
      />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div
          className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 sm:snap-none"
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

        {showDeclined && declinedCount > 0 && (
          <div className="mt-2">
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <span className="inline-block h-px w-6 bg-muted-foreground/40" aria-hidden />
              <span>Declined / Cancelled</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {grouped.declined.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleCardClick(r.id)}
                  className="rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <RequestCard
                    request={r}
                    commentCount={commentCounts[r.id] ?? 0}
                    draggable={false}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

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

/* ─── Toolbar ──────────────────────────────────────────────────────────── */

function BoardToolbar({
  search,
  onSearch,
  priority,
  onPriority,
  project,
  onProject,
  projects,
  declinedCount,
  showDeclined,
  onToggleDeclined,
  assignee,
  onAssignee,
  staffOptions,
}: {
  search: string;
  onSearch: (v: string) => void;
  priority: string | null;
  onPriority: (v: string | null) => void;
  project: string | null;
  onProject: (v: string | null) => void;
  projects: { id: string; name: string }[];
  declinedCount: number;
  showDeclined: boolean;
  onToggleDeclined: () => void;
  assignee: string | null;
  onAssignee: (v: string | null) => void;
  staffOptions: StaffOption[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] max-w-sm flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search title, description, project…"
          className={cn(
            'h-9 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm',
            'placeholder:text-muted-foreground/70',
            'focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30',
            'transition-colors duration-150'
          )}
          aria-label="Search requests"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <FilterChip
          active={priority === null}
          onClick={() => onPriority(null)}
          label="All priorities"
        />
        {PRIORITIES.map((p) => (
          <FilterChip
            key={p}
            active={priority === p}
            onClick={() => onPriority(priority === p ? null : p)}
            label={p}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <FilterChip active={assignee === null} onClick={() => onAssignee(null)} label="All" />
        <FilterChip
          active={assignee === 'mine'}
          onClick={() => onAssignee(assignee === 'mine' ? null : 'mine')}
          label="Mine"
        />
        <FilterChip
          active={assignee === 'unassigned'}
          onClick={() => onAssignee(assignee === 'unassigned' ? null : 'unassigned')}
          label="Unassigned"
        />
        {staffOptions.length > 0 && (
          <select
            value={assignee && assignee !== 'mine' && assignee !== 'unassigned' ? assignee : ''}
            onChange={(e) => onAssignee(e.target.value || null)}
            className={cn(
              'h-7 rounded-full border px-2.5 text-[11px] font-medium transition-colors',
              assignee && assignee !== 'mine' && assignee !== 'unassigned'
                ? 'border-primary/40 bg-primary/[0.08] text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
            )}
            aria-label="Filter by assignee"
          >
            <option value="">By staff…</option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name || 'Unnamed'}
              </option>
            ))}
          </select>
        )}
      </div>

      {projects.length > 1 && (
        <select
          value={project ?? ''}
          onChange={(e) => onProject(e.target.value || null)}
          className={cn(
            'h-9 rounded-xl border border-border bg-card px-3 text-sm',
            'focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30'
          )}
          aria-label="Filter by project"
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      {declinedCount > 0 && (
        <button
          type="button"
          onClick={onToggleDeclined}
          className={cn(
            'h-9 rounded-xl border px-3 text-xs font-medium transition-colors',
            showDeclined
              ? 'border-muted-foreground/40 bg-muted/50 text-foreground'
              : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'
          )}
        >
          {showDeclined ? 'Hide' : 'Show'} declined ({declinedCount})
        </button>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-7 rounded-full border px-2.5 text-[11px] font-medium capitalize transition-colors',
        active
          ? 'border-primary/40 bg-primary/[0.08] text-primary'
          : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
      )}
    >
      {label}
    </button>
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

      <div className="flex min-h-[60px] flex-1 flex-col gap-2">
        {requests.length === 0 ? (
          <div
            className={cn(
              'flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 px-3 py-6 text-center text-[11px] text-muted-foreground/40',
              isOver && 'border-primary/40 text-primary/60'
            )}
          >
            {isOver ? 'Drop here' : 'No requests'}
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
  // PointerSensor activates after 6px movement, so a stationary click passes
  // through here without triggering drag. Mouse-up without movement → onClick.
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
  const cancelled = isCancelled(request);
  return (
    <article
      className={cn(
        'group rounded-xl border bg-card p-3 transition-colors',
        isDragOverlay
          ? 'border-primary/60 shadow-elevation-3 ring-1 ring-primary/20'
          : 'border-border/70 hover:border-primary/30 hover:bg-card/70',
        cancelled && 'opacity-60'
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
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
            {request.title}
          </h3>
          {request.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{request.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={request.priority} />
            {request.project && (
              <span className="truncate text-[11px] text-muted-foreground">
                {request.project.name}
              </span>
            )}
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
