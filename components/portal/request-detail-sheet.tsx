'use client';

import { useCallback, useState, useTransition } from 'react';
import {
  CheckCircle2,
  XCircle,
  Paperclip,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RichText } from '@/components/ui/rich-text';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { RequestCommentThread } from './request-comment-thread';
import {
  updateFeatureRequest,
  markFeatureRequestDone,
  cancelFeatureRequest,
  getRequestAttachmentUrl,
  assignFeatureRequest,
} from '@/app/actions/client-requests';
import { cn } from '@/lib/utils';

type RequestStatus = 'pending' | 'in_review' | 'planned' | 'in_progress' | 'completed' | 'declined';

interface RequestAttachmentMeta {
  name: string;
  path: string;
  size: number;
  type: string;
  uploaded_at: string;
}

interface FeatureRequest {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  attachments?: RequestAttachmentMeta[] | null;
  project: { id: string; name: string } | null;
  assigned_to?: string | null;
  assignee?: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

interface StaffOption {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface RequestDetailSheetProps {
  request: FeatureRequest | null;
  userRole: string;
  currentUserId: string;
  onClose: () => void;
  staffOptions?: StaffOption[];
}

const PIPELINE: { key: RequestStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'in_review', label: 'In Review' },
  { key: 'planned', label: 'Planned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

export function RequestDetailSheet({
  request,
  userRole,
  currentUserId,
  onClose,
  staffOptions = [],
}: RequestDetailSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'decline' | 'mark-done' | null>(
    null
  );

  const handleAssignChange = useCallback(
    (newAssigneeId: string) => {
      if (!request) return;
      // Empty string from the <select> means "Unassigned" → write null
      const assigneeId = newAssigneeId === '' ? null : newAssigneeId;
      startTransition(async () => {
        const res = await assignFeatureRequest(request.id, assigneeId);
        if (!res.success) {
          toast.error(res.error || 'Failed to assign');
          return;
        }
        toast.success(assigneeId ? 'Request assigned' : 'Request unassigned');
        router.refresh();
      });
    },
    [request, router]
  );

  const isAdmin = userRole === 'admin';
  const isStaff = isAdmin || userRole === 'employee';
  const isClient = userRole === 'client';

  const handleStatusChange = useCallback(
    (newStatus: RequestStatus) => {
      if (!request) return;
      startTransition(async () => {
        const res = await updateFeatureRequest(request.id, { status: newStatus });
        if (!res.success) {
          toast.error(res.error || 'Failed to update status');
          return;
        }
        toast.success(`Moved to ${PIPELINE.find((p) => p.key === newStatus)?.label ?? newStatus}`);
        router.refresh();
      });
    },
    [request, router]
  );

  const handleMarkDone = useCallback(() => {
    if (!request) return;
    startTransition(async () => {
      const res = await markFeatureRequestDone(request.id);
      if (!res.success) {
        toast.error(res.error || 'Failed to mark as done');
        return;
      }
      setConfirmAction(null);
      toast.success('Marked as done — client notified');
      router.refresh();
      onClose();
    });
  }, [request, router, onClose]);

  const handleDecline = useCallback(() => {
    if (!request) return;
    startTransition(async () => {
      const res = await updateFeatureRequest(request.id, { status: 'declined' });
      if (!res.success) {
        toast.error(res.error || 'Failed to decline');
        return;
      }
      setConfirmAction(null);
      toast.success('Request declined');
      router.refresh();
      onClose();
    });
  }, [request, router, onClose]);

  const handleClientCancel = useCallback(() => {
    if (!request) return;
    startTransition(async () => {
      const res = await cancelFeatureRequest(request.id);
      if (!res.success) {
        toast.error(res.error || 'Failed to cancel');
        return;
      }
      setConfirmAction(null);
      toast.success('Request cancelled');
      router.refresh();
      onClose();
    });
  }, [request, router, onClose]);

  if (!request) return null;

  const currentStatus = (request.status as RequestStatus) ?? 'pending';
  const isClosed = currentStatus === 'completed' || currentStatus === 'declined';
  const attachmentCount = request.attachments?.length ?? 0;

  return (
    <>
      <Sheet open={!!request} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          {/* Header */}
          <SheetHeader className="space-y-3 border-b border-border/60 bg-card/40 px-5 py-4">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <span className="inline-block h-px w-5 bg-primary/60" aria-hidden />
              <span>Request</span>
              {request.project && (
                <>
                  <span aria-hidden>·</span>
                  <span className="truncate normal-case tracking-normal">
                    {request.project.name}
                  </span>
                </>
              )}
            </div>
            <SheetTitle className="text-left text-xl font-semibold leading-tight tracking-tight">
              {request.title}
            </SheetTitle>
            <SheetDescription className="sr-only">Detail view for feature request</SheetDescription>
            <StatusPipeline currentStatus={currentStatus} />
          </SheetHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-5">
              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <PriorityBadge priority={request.priority} />
                <span className="text-muted-foreground">
                  Submitted {new Date(request.created_at).toLocaleDateString()}
                </span>
                {attachmentCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Paperclip className="h-3 w-3" />
                    {attachmentCount} attachment{attachmentCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              {/* Assignee — admins can change, employees see read-only */}
              {isStaff && (
                <section>
                  <SectionHeading>Assigned to</SectionHeading>
                  {isAdmin && staffOptions.length > 0 ? (
                    <select
                      value={request.assigned_to ?? ''}
                      onChange={(e) => handleAssignChange(e.target.value)}
                      disabled={isPending}
                      className={cn(
                        'mt-2 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm',
                        'focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30',
                        'disabled:cursor-not-allowed disabled:opacity-50'
                      )}
                      aria-label="Assign request to"
                    >
                      <option value="">Unassigned</option>
                      {staffOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name || 'Unnamed'}
                          {s.id === currentUserId ? ' (me)' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-2 text-sm text-foreground">
                      {request.assignee?.full_name ?? (
                        <span className="text-muted-foreground/70">Unassigned</span>
                      )}
                    </p>
                  )}
                </section>
              )}

              {/* Description */}
              {request.description && (
                <section>
                  <SectionHeading>Description</SectionHeading>
                  <RichText className="mt-2 text-sm leading-relaxed text-foreground">
                    {request.description}
                  </RichText>
                </section>
              )}

              {/* Attachments */}
              {attachmentCount > 0 && (
                <section>
                  <SectionHeading>Attachments</SectionHeading>
                  <ul className="mt-2 space-y-1.5">
                    {request.attachments!.map((att) => (
                      <AttachmentItem key={att.path} requestId={request.id} attachment={att} />
                    ))}
                  </ul>
                </section>
              )}

              {/* Actions */}
              {(isStaff || isClient) && !isClosed && (
                <section>
                  <SectionHeading>Actions</SectionHeading>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {isStaff &&
                      PIPELINE.filter((p) => p.key !== currentStatus && p.key !== 'completed').map(
                        (p) => (
                          <Button
                            key={p.key}
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleStatusChange(p.key)}
                            className="h-8 px-3 text-xs"
                          >
                            Move to {p.label}
                          </Button>
                        )
                      )}
                    {isAdmin && (
                      <Button
                        variant="default"
                        size="sm"
                        disabled={isPending}
                        onClick={() => setConfirmAction('mark-done')}
                        className="h-8 gap-1.5 px-3 text-xs"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark as done
                      </Button>
                    )}
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => setConfirmAction('decline')}
                        className="h-8 gap-1.5 px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Decline
                      </Button>
                    )}
                    {isClient && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => setConfirmAction('cancel')}
                        className="h-8 gap-1.5 px-3 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel request
                      </Button>
                    )}
                  </div>
                  {isPending && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Updating…
                    </p>
                  )}
                </section>
              )}

              {/* Comments */}
              <section>
                <SectionHeading>Comments</SectionHeading>
                <div className="mt-3">
                  <RequestCommentThread
                    requestId={request.id}
                    currentUserId={currentUserId}
                    userRole={userRole}
                    legacyAdminResponse={request.admin_response}
                  />
                </div>
              </section>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmAction === 'mark-done'}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title="Mark request as done"
        description="The client will be notified. To leave a note, add a comment before marking done."
        confirmLabel="Mark as done"
        variant="default"
        onConfirm={handleMarkDone}
      />

      <ConfirmDialog
        open={confirmAction === 'decline'}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title="Decline this request?"
        description="The client will see this request as declined. Add context via a comment first if helpful."
        confirmLabel="Decline"
        variant="destructive"
        onConfirm={handleDecline}
      />

      <ConfirmDialog
        open={confirmAction === 'cancel'}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title="Cancel this request?"
        description="This will close the request. You can always submit a new one."
        confirmLabel="Cancel request"
        variant="destructive"
        onConfirm={handleClientCancel}
      />
    </>
  );
}

/* ─── Status pipeline ──────────────────────────────────────────────────── */

function StatusPipeline({ currentStatus }: { currentStatus: RequestStatus }) {
  if (currentStatus === 'declined') {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden />
        <span className="font-medium text-foreground">Declined</span>
      </div>
    );
  }

  const currentIndex = PIPELINE.findIndex((p) => p.key === currentStatus);

  return (
    <ol className="flex items-center gap-1.5" aria-label="Request pipeline status">
      {PIPELINE.map((step, idx) => {
        const isPast = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        return (
          <li key={step.key} className="flex items-center gap-1.5">
            <span
              className={cn(
                'flex h-2 w-2 shrink-0 rounded-full transition-colors',
                isCurrent
                  ? 'bg-primary ring-4 ring-primary/15'
                  : isPast
                    ? 'bg-primary/70'
                    : 'bg-muted-foreground/20'
              )}
              aria-hidden
            />
            <span
              className={cn(
                'text-[11px]',
                isCurrent
                  ? 'font-medium text-foreground'
                  : isPast
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground/50'
              )}
            >
              {step.label}
            </span>
            {idx < PIPELINE.length - 1 && (
              <span
                className={cn(
                  'mx-0.5 h-px w-3',
                  isPast ? 'bg-primary/40' : 'bg-muted-foreground/15'
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ─── Attachment item ─────────────────────────────────────────────────── */

function AttachmentItem({
  requestId,
  attachment,
}: {
  requestId: string;
  attachment: RequestAttachmentMeta;
}) {
  const [busy, setBusy] = useState(false);
  const Icon = attachment.type.startsWith('image/') ? ImageIcon : FileText;

  const handleDownload = async () => {
    setBusy(true);
    const res = await getRequestAttachmentUrl(requestId, attachment.path);
    setBusy(false);
    if (!res.success || !res.data) {
      toast.error(res.error || 'Failed to get download URL');
      return;
    }
    const { url } = res.data as { url: string };
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate" title={attachment.name}>
          {attachment.name}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground/70">
          {formatBytes(attachment.size)}
        </span>
      </div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={busy}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-50"
        aria-label={`Download ${attachment.name}`}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
      </button>
    </li>
  );
}

/* ─── Small helpers ───────────────────────────────────────────────────── */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </h3>
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
      className={cn('h-5 rounded-full px-2 text-[10px] font-medium capitalize', tone)}
    >
      {priority}
    </Badge>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
