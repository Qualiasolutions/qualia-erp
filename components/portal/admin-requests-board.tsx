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
import { Building2, Inbox, Paperclip, MessageSquare, GripVertical, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { updateFeatureRequest } from '@/app/actions/client-requests';
import { RequestDetailSheet } from './request-detail-sheet';

type RequestStatus = 'pending' | 'in_progress' | 'completed';

interface ProjectOption {
  id: string;
  name: string;
}

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
  project: {
    id: string;
    name: string;
    logo_url: string | null;
    client: { id: string; display_name: string | null; logo_url: string | null } | null;
  } | null;
  client: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
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
  projects?: ProjectOption[];
  initialProjectId?: string | null;
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

type PriorityFilter = 'all' | 'urgent' | 'high' | 'medium' | 'low';

export function AdminRequestsBoard({
  requests,
  commentCounts = {},
  currentUserId,
  userRole,
  staffOptions = [],
  projects = [],
  initialProjectId = null,
}: AdminRequestsBoardProps) {
  const router = useRouter();
  const isClient = userRole === 'client';
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const [projectFilter, setProjectFilter] = useState<string>(
    initialProjectId && projects.some((project) => project.id === initialProjectId)
      ? initialProjectId
      : 'all'
  );
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [query, setQuery] = useState('');
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
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      const uiStatus = r.id in optimisticStatus ? optimisticStatus[r.id] : toUiStatus(r.status);
      if (uiStatus === 'archived') return false;
      if (projectFilter !== 'all' && r.project?.id !== projectFilter) return false;
      if (!isClient && scope === 'mine' && r.assigned_to !== currentUserId) return false;
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
      if (q) {
        const haystack =
          `${r.title} ${r.description ?? ''} ${r.project?.name ?? ''} ${getRequestClientName(r)}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    requests,
    optimisticStatus,
    projectFilter,
    scope,
    currentUserId,
    priorityFilter,
    query,
    isClient,
  ]);

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

  const totalVisible = visibleRequests.length;
  const totalUnfiltered = requests.filter((r) => {
    const s = r.id in optimisticStatus ? optimisticStatus[r.id] : toUiStatus(r.status);
    return s !== 'archived';
  }).length;
  const hasActiveFilter =
    projectFilter !== 'all' ||
    priorityFilter !== 'all' ||
    query.trim().length > 0 ||
    (!isClient && scope === 'mine');
  const showProjectFilter = projects.length > 1 || projectFilter !== 'all';

  const PRIORITIES: { value: PriorityFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  // Clients with no requests at all see a full-page zero-state CTA instead
  // of three empty columns + a useless toolbar. The "New request" button in
  // the page header is the primary action.
  if (isClient && totalUnfiltered === 0) {
    return (
      <div className="flex min-h-[340px] flex-col items-center justify-center rounded-xl border border-border bg-card px-5 py-12 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/[0.08] text-primary ring-1 ring-primary/15">
          <Inbox className="h-4 w-4" aria-hidden />
        </div>
        <h2 className="mt-4 text-base font-semibold tracking-tight text-foreground">
          No requests yet
        </h2>
        <p className="mt-1.5 max-w-[360px] text-sm leading-relaxed text-muted-foreground">
          When you submit a feature request, change, or question, it shows up here so you can follow
          its status through to completion.
        </p>
        <p className="mt-4 rounded-md bg-muted/50 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          New request opens the intake flow
        </p>
      </div>
    );
  }

  // Clients only see search + count. Priority chips and Mine/All are
  // staff-only — clients don't triage their own queue.
  const showStaffControls = !isClient;
  // Search is only useful with enough rows to scroll through. Below the
  // threshold (5 total), it's noise.
  const showSearch = totalUnfiltered >= 5 || query.length > 0;

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Toolbar: scope · search · priority · count */}
      {(showStaffControls || showSearch || showProjectFilter) && (
        <div className="flex flex-wrap items-center gap-2">
          {showProjectFilter && (
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              aria-label="Filter by project"
              className={cn(
                'h-9 max-w-full rounded-md border border-border bg-card px-3 text-sm text-foreground',
                'focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20'
              )}
            >
              <option value="all">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          )}

          {showStaffControls && (
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
          )}

          {showSearch && (
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60"
                aria-hidden
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search requests…"
                aria-label="Search requests"
                className="h-9 w-full rounded-md border border-border bg-card pl-8 pr-8 text-sm placeholder:text-muted-foreground/70 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {showStaffControls && (
            <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by priority">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriorityFilter(p.value)}
                  aria-pressed={priorityFilter === p.value}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    priorityFilter === p.value
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/20 hover:text-foreground'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          <div className="ml-auto flex items-center gap-2 font-mono text-[11px] tabular-nums text-muted-foreground">
            <span>
              {totalVisible}
              {hasActiveFilter && totalVisible !== totalUnfiltered ? ` / ${totalUnfiltered}` : ''}
            </span>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => {
                  setPriorityFilter('all');
                  setQuery('');
                  setProjectFilter('all');
                  if (!isClient) setScope('all');
                }}
                className="cursor-pointer rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {isClient ? (
        <div
          className="-mx-1 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-1 pb-2 md:grid md:snap-none md:grid-cols-3 md:overflow-visible"
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
              isClient
              readOnly
            />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div
            className="-mx-1 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-1 pb-2 md:grid md:snap-none md:grid-cols-3 md:overflow-visible"
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
      )}

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
  readOnly = false,
  isClient = false,
}: {
  status: RequestStatus;
  label: string;
  eyebrow: string;
  count: number;
  requests: FeatureRequest[];
  commentCounts: Record<string, number>;
  onCardClick: (id: string) => void;
  readOnly?: boolean;
  isClient?: boolean;
}) {
  return readOnly ? (
    <StaticColumn label={label} eyebrow={eyebrow} count={count}>
      {requests.length === 0 ? (
        <EmptyColumn />
      ) : (
        requests.map((r) => (
          <ClickableCard
            key={r.id}
            request={r}
            commentCount={commentCounts[r.id] ?? 0}
            isClient={isClient}
            onClick={() => onCardClick(r.id)}
          />
        ))
      )}
    </StaticColumn>
  ) : (
    <DroppableColumn
      status={status}
      label={label}
      eyebrow={eyebrow}
      count={count}
      requests={requests}
      commentCounts={commentCounts}
      onCardClick={onCardClick}
    />
  );
}

function DroppableColumn({
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
        'flex w-[280px] shrink-0 snap-start flex-col rounded-xl border border-border bg-card/60 p-2.5 transition-colors sm:w-[300px] md:w-auto md:min-w-0 md:shrink',
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

      <div className="flex max-h-[calc(100vh-220px)] min-h-[200px] flex-col gap-2 overflow-y-auto">
        {requests.length === 0 ? (
          <div
            className={cn(
              'flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 px-3 pb-4 pt-6 text-center',
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

/* ─── Static (read-only) column for clients ────────────────────────────── */

function StaticColumn({
  label,
  eyebrow,
  count,
  children,
}: {
  label: string;
  eyebrow: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-[280px] shrink-0 snap-start flex-col rounded-xl border border-border bg-card/60 p-2.5 sm:w-[300px] md:w-auto md:min-w-0 md:shrink">
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
      <div className="flex max-h-[calc(100vh-220px)] min-h-[200px] flex-col gap-2 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

function EmptyColumn() {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 px-3 pb-4 pt-6 text-center">
      <Inbox className="h-6 w-6 text-muted-foreground/25" />
      <span className="text-[11px] text-muted-foreground/40">All clear</span>
    </div>
  );
}

function ClickableCard({
  request,
  commentCount,
  onClick,
  isClient = false,
}: {
  request: FeatureRequest;
  commentCount: number;
  onClick: () => void;
  isClient?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      className="cursor-pointer rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <RequestCard
        request={request}
        commentCount={commentCount}
        draggable={false}
        isClient={isClient}
      />
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
  isClient = false,
}: {
  request: FeatureRequest;
  commentCount: number;
  draggable: boolean;
  isDragOverlay?: boolean;
  isClient?: boolean;
}) {
  const attachmentCount = request.attachments?.length ?? 0;
  // Heading hierarchy depends on viewer:
  //   - Staff (admin/employee) scan by project → project name as primary
  //   - Clients scan by their own request topic → request title as primary
  // Both views still show both fields, just with the emphasis swapped.
  const projectLabel = request.project?.name ?? null;
  const clientName = getRequestClientName(request);
  const logoUrl =
    request.project?.client?.logo_url ??
    request.project?.logo_url ??
    request.client?.avatar_url ??
    null;
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
          {isClient ? (
            <>
              {/* Client view: request title is what they wrote, primary heading */}
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                {request.title}
              </h3>
              {projectLabel && (
                <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">
                  {projectLabel}
                </p>
              )}
            </>
          ) : (
            <>
              {/* Staff view: client identity is primary so triagers instantly see who asked. */}
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/25 px-2 py-1.5">
                <Avatar className="size-7 rounded-lg">
                  {logoUrl && <AvatarImage src={logoUrl} alt="" className="object-cover" />}
                  <AvatarFallback className="rounded-lg bg-primary/10 text-[10px] font-semibold text-primary">
                    {clientName ? (
                      clientName.slice(0, 2).toUpperCase()
                    ) : (
                      <Building2 className="size-3" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold leading-tight text-foreground">
                    {clientName || 'Unknown client'}
                  </p>
                  <p className="truncate text-[10px] leading-tight text-muted-foreground">
                    {projectLabel ?? 'No linked project'}
                  </p>
                </div>
              </div>
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                {request.title}
              </h3>
            </>
          )}
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

function getRequestClientName(request: FeatureRequest): string {
  return (
    request.project?.client?.display_name ||
    request.client?.full_name ||
    request.client?.email ||
    'Unknown client'
  );
}

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
