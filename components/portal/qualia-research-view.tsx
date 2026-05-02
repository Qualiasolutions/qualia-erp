'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { format, isAfter, subDays } from 'date-fns';
import { toast } from 'sonner';
import {
  Search,
  FlaskConical,
  Link2,
  Sparkles,
  ChevronDown,
  Trash2,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { m, AnimatePresence } from '@/lib/lazy-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';
import {
  createResearchEntry,
  createResearchFromPaste,
  deleteResearchEntry,
  type ResearchEntry,
} from '@/app/actions/research';
import { RESEARCH_CATEGORIES, CATEGORY_COLORS, getCategoryLabel } from '@/lib/research-constants';

interface QualiaResearchViewProps {
  initialEntries: ResearchEntry[];
  isAdmin?: boolean;
}

function readingMinutes(text: string | null): string {
  if (!text) return '1 min read';
  const words = text.trim().split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

function sourceCount(sources: string | null): number {
  if (!sources) return 0;
  return sources.split('\n').filter((line) => line.trim().length > 0).length;
}

function isNew(date: string): boolean {
  const d = new Date(date);
  return isAfter(d, subDays(new Date(), 7));
}

function splitFindings(keyFindings: string | null): string[] {
  if (!keyFindings) return [];
  return keyFindings
    .split('\n')
    .map((l) => l.replace(/^[\s\-•*\d.)]+/, '').trim())
    .filter((l) => l.length > 0)
    .slice(0, 8);
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/* ─── Post component ──────────────────────────────────────────── */
function ResearchPost({
  entry,
  isAdmin,
  onDelete,
}: {
  entry: ResearchEntry;
  isAdmin?: boolean;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const colors = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.general;
  const findings = splitFindings(entry.key_findings);
  const sources = entry.sources ? entry.sources.split('\n').filter((s) => s.trim()) : [];
  const srcCount = sourceCount(entry.sources);
  const summary = entry.summary || '';
  const isLong = summary.length > 200 || findings.length > 0 || sources.length > 0;

  return (
    <m.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="motion-reduce:animate-none"
    >
      {/* Meta row */}
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 font-medium',
            colors.bg,
            colors.text,
            colors.border
          )}
        >
          {getCategoryLabel(entry.category)}
        </span>
        <span aria-hidden="true">·</span>
        <time dateTime={entry.research_date}>{format(new Date(entry.research_date), 'MMM d')}</time>
        <span aria-hidden="true">·</span>
        <span>{readingMinutes(entry.summary || entry.raw_content)}</span>
        {entry.author && (
          <>
            <span aria-hidden="true">·</span>
            <span>by {entry.author.full_name || entry.author.email}</span>
          </>
        )}
        {isNew(entry.created_at) && (
          <span
            className="ml-1 inline-block h-2 w-2 rounded-full bg-primary"
            title="Added within the last 7 days"
            aria-label="New"
          />
        )}
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
        {entry.title}
      </h2>

      {/* Summary / collapsed */}
      {summary && (
        <p
          className={cn(
            'mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base',
            !expanded && isLong && 'line-clamp-3'
          )}
        >
          {summary}
        </p>
      )}

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && (findings.length > 0 || sources.length > 0) && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden motion-reduce:animate-none"
          >
            {/* Key findings */}
            {findings.length > 0 && (
              <ol className="mt-4 space-y-2 pl-0">
                {findings.map((finding, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{finding}</span>
                  </li>
                ))}
              </ol>
            )}

            {/* Sources */}
            {sources.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {sources.map((src, i) => {
                  const urlMatch = src.match(/(https?:\/\/[^\s<>"{}|\\^`[\]]+)/);
                  if (!urlMatch) return null;
                  const url = urlMatch[1].replace(/[.,;:!?)]+$/, '');
                  const domain = extractDomain(url);
                  return (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors duration-150 hover:border-primary/20 hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="max-w-[200px] truncate">{domain}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </m.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="mt-3 flex items-center gap-3">
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-md px-1 text-xs font-medium text-primary transition-colors duration-150 hover:text-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:min-h-0"
          >
            {expanded ? 'Show less' : 'Read more'}
            <ChevronDown
              className={cn(
                'ease-[cubic-bezier(0.16,1,0.3,1)] h-3.5 w-3.5 transition-transform duration-200',
                expanded && 'rotate-180'
              )}
            />
          </button>
        )}

        {srcCount > 0 && !expanded && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link2 className="h-3 w-3" />
            {srcCount} source{srcCount === 1 ? '' : 's'}
          </span>
        )}

        {isAdmin && (
          <button
            onClick={onDelete}
            className="ml-auto inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-md px-1 text-xs text-muted-foreground transition-colors duration-150 hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 sm:min-h-0"
            aria-label={`Delete ${entry.title}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </m.article>
  );
}

/* ─── Main component ──────────────────────────────────────────── */
export function QualiaResearchView({ initialEntries, isAdmin }: QualiaResearchViewProps) {
  const [entries, setEntries] = useState<ResearchEntry[]>(initialEntries);
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [pasteContent, setPasteContent] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ResearchEntry | null>(null);
  const [isParsing, startParseTransition] = useTransition();
  const [, startTransition] = useTransition();

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (categoryFilter !== 'all') {
      result = result.filter((e) => e.category === categoryFilter);
    }
    if (filter.trim()) {
      const q = filter.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.topic.toLowerCase().includes(q) ||
          (e.summary?.toLowerCase().includes(q) ?? false)
      );
    }
    return result;
  }, [entries, filter, categoryFilter]);

  const handlePasteSubmit = useCallback(() => {
    const text = pasteContent.trim();
    if (!text) return;
    startParseTransition(async () => {
      const result = await createResearchFromPaste(text);
      if (!result.success) {
        toast.error(result.error || 'Failed to parse research');
        return;
      }
      if (result.data) {
        setEntries((prev) => [result.data!, ...prev]);
        toast.success(`Saved · ${result.data.title}`);
      }
      setPasteContent('');
    });
  }, [pasteContent]);

  const handleDelete = useCallback(() => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    const prev = entries;
    setEntries((curr) => curr.filter((e) => e.id !== target.id));
    startTransition(async () => {
      const r = await deleteResearchEntry(target.id);
      if (!r.success) {
        setEntries(prev);
        toast.error(r.error || 'Failed to delete');
        return;
      }
      toast.success(`Deleted "${target.title}"`);
    });
  }, [pendingDelete, entries]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Page header */}
      <PageHeader icon={<FlaskConical className="h-3.5 w-3.5 text-primary" />} title="Research" />

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* Paste zone */}
          <section className="mb-8 sm:mb-12">
            <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">AI-powered</span>
              </div>

              <Textarea
                aria-label="Paste research content for AI parsing"
                placeholder="Paste your Gemini Deep Research, NotebookLM, ChatGPT, or any research dump — AI will turn it into a clean post."
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                disabled={isParsing}
                rows={4}
                className="mb-3 min-h-[120px] resize-y border-transparent bg-muted/30 text-sm placeholder:text-muted-foreground/60 focus:border-primary/30 focus:bg-background"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => setShowNewDialog(true)}
                  className="cursor-pointer text-xs text-muted-foreground underline-offset-2 transition-colors duration-150 hover:text-foreground hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  Or fill the form manually
                </button>

                <Button
                  onClick={handlePasteSubmit}
                  disabled={isParsing || !pasteContent.trim()}
                  className="min-h-[44px] gap-2 rounded-lg px-5 sm:min-h-0"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    'Parse & save'
                  )}
                </Button>
              </div>
            </div>
          </section>

          {/* Filter bar */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search research..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-9 rounded-lg pl-9 text-sm"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-full rounded-lg sm:w-44">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {RESEARCH_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Posts feed */}
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FlaskConical className="mb-3 h-12 w-12 text-muted-foreground/30" />
              <h3 className="text-base font-medium text-foreground">
                {entries.length === 0 ? 'No research yet' : 'No entries match your filters'}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {entries.length === 0
                  ? 'Paste a research dump above to start the feed.'
                  : 'Try adjusting your search or category filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-12 sm:space-y-16">
              {filteredEntries.map((entry, i) => (
                <div key={entry.id}>
                  {i > 0 && (
                    <div className="mb-12 border-t border-border/50 sm:mb-16" aria-hidden="true" />
                  )}
                  <ResearchPost
                    entry={entry}
                    isAdmin={isAdmin}
                    onDelete={() => setPendingDelete(entry)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New entry dialog (manual fallback) */}
      <NewEntryDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onCreated={(created) => setEntries((prev) => [created, ...prev])}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this research entry?"
        description={pendingDelete ? `"${pendingDelete.title}" will be permanently deleted.` : ''}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

/* ─── New Entry Dialog (manual form) ──────────────────────────── */
function NewEntryDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (e: ResearchEntry) => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [summary, setSummary] = useState('');
  const [keyFindings, setKeyFindings] = useState('');
  const [sources, setSources] = useState('');
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setTitle('');
    setCategory('general');
    setSummary('');
    setKeyFindings('');
    setSources('');
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    startTransition(async () => {
      const r = await createResearchEntry({
        title: title.trim(),
        topic: title.trim(),
        category,
        summary: summary.trim() || undefined,
        key_findings: keyFindings.trim() || undefined,
        sources: sources.trim() || undefined,
        research_date: new Date().toISOString().split('T')[0],
      });
      if (!r.success) {
        toast.error(r.error || 'Failed to create entry');
        return;
      }
      const created = (r as { success: true; data?: ResearchEntry }).data;
      if (created) onCreated(created);
      toast.success('Entry created');
      reset();
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Research Entry</DialogTitle>
          <DialogDescription>
            Capture findings from a topic you researched. One entry per line for key findings and
            sources.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="r-title">Title</Label>
            <Input
              id="r-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Voice AI Platform Updates"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-cat">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={isPending}>
              <SelectTrigger id="r-cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESEARCH_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-summary">Summary</Label>
            <Textarea
              id="r-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What did you find?"
              rows={3}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-findings">Key Findings (one per line)</Label>
            <Textarea
              id="r-findings"
              value={keyFindings}
              onChange={(e) => setKeyFindings(e.target.value)}
              placeholder="VAPI leads in enterprise integrations&#10;ElevenLabs best for voice quality"
              rows={4}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-sources">Sources (one URL per line)</Label>
            <Textarea
              id="r-sources"
              value={sources}
              onChange={(e) => setSources(e.target.value)}
              placeholder="https://example.com/article-1"
              rows={3}
              disabled={isPending}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !title.trim()}>
              Create Entry
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
