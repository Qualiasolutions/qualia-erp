'use client';

import { useEffect, useState } from 'react';
import { Download, FileText, Image as ImageIcon, Loader2, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

import {
  getProjectBriefs,
  getRequestAttachmentUrl,
  type RequestAttachment,
} from '@/app/actions/client-requests';
import type { BriefData, BriefSection } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface BriefRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  brief_data: BriefData | null;
  attachments: RequestAttachment[];
  submitter: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

interface ProjectBriefViewerProps {
  projectId: string;
  className?: string;
}

export function ProjectBriefViewer({ projectId, className }: ProjectBriefViewerProps) {
  const [briefs, setBriefs] = useState<BriefRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const [activeBriefId, setActiveBriefId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getProjectBriefs(projectId);
      if (cancelled) return;
      if (!res.success) {
        setLoadError(res.error || 'Failed to load briefs');
        setBriefs([]);
        return;
      }
      const rows = (res.data ?? []) as BriefRow[];
      setBriefs(rows);
      if (rows.length > 0) setActiveBriefId(rows[0].id);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const activeBrief = briefs?.find((b) => b.id === activeBriefId) ?? null;

  // Skeleton during initial load — keeps the section visible so users learn
  // briefs live here even before the fetch returns.
  if (briefs === null) {
    return (
      <section className={cn('space-y-3 p-4', className)}>
        <Header />
        <div className="h-9 animate-pulse rounded-md bg-muted/40" />
      </section>
    );
  }

  if (loadError) {
    return (
      <section className={cn('space-y-3 p-4', className)}>
        <Header />
        <p className="text-xs text-muted-foreground">{loadError}</p>
      </section>
    );
  }

  if (briefs.length === 0) {
    return (
      <section className={cn('space-y-3 p-4', className)}>
        <Header />
        <p className="text-xs leading-relaxed text-muted-foreground">
          No briefs submitted yet. When the client fills out the project brief in their portal, it
          appears here.
        </p>
      </section>
    );
  }

  return (
    <section className={cn('space-y-3 p-4', className)}>
      <Header count={briefs.length} />

      <ul className="space-y-1.5">
        {briefs.map((b) => {
          const submitterName = b.submitter?.full_name || 'Client';
          const attachmentCount = b.attachments.length;
          return (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => {
                  setActiveBriefId(b.id);
                  setOpen(true);
                }}
                className="group flex w-full items-start justify-between gap-3 rounded-lg border border-border bg-card/40 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{submitterName}</p>
                  <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                    {formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}
                    {attachmentCount > 0 && (
                      <>
                        {' · '}
                        <span className="inline-flex items-center gap-0.5">
                          <Paperclip className="h-2.5 w-2.5" />
                          {attachmentCount}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/70 transition-colors group-hover:text-primary">
                  View
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-2xl">
          {activeBrief && <BriefDetail brief={activeBrief} />}
        </SheetContent>
      </Sheet>
    </section>
  );
}

function Header({ count }: { count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-amber-500/10">
        <FileText className="h-3.5 w-3.5 text-amber-400" />
      </div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Client Briefs
      </p>
      {typeof count === 'number' && count > 0 && (
        <span className="rounded-full bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

function BriefDetail({ brief }: { brief: BriefRow }) {
  const submitterName = brief.submitter?.full_name || 'Client';
  const sections = resolveSections(brief);

  return (
    <>
      <SheetHeader className="border-b border-border px-6 py-4">
        <SheetTitle className="text-base">{brief.title}</SheetTitle>
        <p className="text-xs text-muted-foreground">
          Submitted by <span className="text-foreground">{submitterName}</span>
          {' · '}
          {new Date(brief.created_at).toLocaleString()}
        </p>
      </SheetHeader>

      <ScrollArea className="flex-1">
        <div className="space-y-5 px-6 py-5">
          {sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No structured content in this brief.</p>
          ) : (
            sections.map((s) => <BriefSectionCard key={s.key} section={s} />)
          )}

          {brief.attachments.length > 0 && (
            <div className="space-y-2 border-t border-border pt-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Attachments ({brief.attachments.length})
              </p>
              <ul className="space-y-1.5">
                {brief.attachments.map((att) => (
                  <AttachmentRow key={att.path} requestId={brief.id} attachment={att} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  );
}

function BriefSectionCard({ section }: { section: BriefSection }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 px-4 py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {section.label}
      </p>
      {section.values && section.values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {section.values.map((v) => (
            <span
              key={v}
              className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-foreground"
            >
              {v}
            </span>
          ))}
        </div>
      )}
      {section.value && (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {section.value}
        </p>
      )}
      {section.note && (
        <p className="mt-2 whitespace-pre-wrap border-l-2 border-primary/30 pl-2.5 text-xs italic leading-relaxed text-muted-foreground">
          {section.note}
        </p>
      )}
    </div>
  );
}

function AttachmentRow({
  requestId,
  attachment,
}: {
  requestId: string;
  attachment: RequestAttachment;
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
    <li className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate" title={attachment.name}>
          {attachment.name}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground/70">
          {formatBytes(attachment.size)}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleDownload}
        disabled={busy}
        className="h-7 w-7 p-0"
        aria-label={`Download ${attachment.name}`}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
      </Button>
    </li>
  );
}

/**
 * Returns the section list for a brief. Prefers the structured `brief_data`
 * payload (briefs submitted on or after 2026-05-20). Falls back to parsing
 * the legacy markdown blob in `description` for older submissions.
 */
function resolveSections(brief: BriefRow): BriefSection[] {
  if (brief.brief_data && Array.isArray(brief.brief_data.sections)) {
    return brief.brief_data.sections;
  }
  if (brief.description) {
    return parseMarkdownBrief(brief.description);
  }
  return [];
}

/**
 * Parse a legacy brief markdown blob into the same shape as brief_data.sections.
 * Markdown format produced by buildDescription() in components/portal/briefs:
 *
 *   **Label**
 *   value1, value2, value3
 *   _optional note_
 *
 *   **NextLabel**
 *   ...
 *
 * Best-effort — unrecognized shapes flow into `value` so nothing is dropped.
 */
function parseMarkdownBrief(md: string): BriefSection[] {
  const blocks = md
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  return blocks.map((block, i) => {
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const headerMatch = lines[0]?.match(/^\*\*(.+?)\*\*$/);
    const label = headerMatch ? headerMatch[1] : `Section ${i + 1}`;
    const key =
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .slice(0, 64) || `section_${i}`;
    const rest = headerMatch ? lines.slice(1) : lines;

    const noteIdx = rest.findIndex((l) => /^_.*_$/.test(l));
    const note = noteIdx >= 0 ? rest[noteIdx].replace(/^_(.*)_$/, '$1') : undefined;
    const body = (noteIdx >= 0 ? rest.slice(0, noteIdx) : rest).join('\n');

    const section: BriefSection = { key, label };
    if (body) {
      // Single comma-separated line → treat as chip values (matches buildDescription chip output).
      if (!body.includes('\n') && body.includes(', ') && body.length < 400) {
        section.values = body
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean);
      } else {
        section.value = body;
      }
    }
    if (note) section.note = note;
    return section;
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
