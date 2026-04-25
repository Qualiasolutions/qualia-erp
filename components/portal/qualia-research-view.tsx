'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { format, isAfter, subDays } from 'date-fns';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  FlaskConical,
  Calendar,
  Link2,
  Sparkles,
  TrendingUp,
  Zap,
  ArrowRight,
  X,
  ExternalLink,
  Trash2,
  Lightbulb,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';
import {
  createResearchEntry,
  deleteResearchEntry,
  type ResearchEntry,
} from '@/app/actions/research';
import { RESEARCH_CATEGORIES, getCategoryLabel } from '@/lib/research-constants';

interface QualiaResearchViewProps {
  initialEntries: ResearchEntry[];
  isAdmin?: boolean;
}

function readingMinutes(text: string | null): string {
  if (!text) return '1 min';
  const words = text.trim().split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 220))} min`;
}

function sourceCount(sources: string | null): number {
  if (!sources) return 0;
  return sources.split('\n').filter((line) => line.trim().length > 0).length;
}

function isTrending(date: string): boolean {
  const d = new Date(date);
  return isAfter(d, subDays(new Date(), 7));
}

function splitInsights(keyFindings: string | null): string[] {
  if (!keyFindings) return [];
  return keyFindings
    .split('\n')
    .map((l) => l.replace(/^[\s\-•*\d.)]+/, '').trim())
    .filter((l) => l.length > 0)
    .slice(0, 8);
}

export function QualiaResearchView({ initialEntries, isAdmin }: QualiaResearchViewProps) {
  const [entries, setEntries] = useState<ResearchEntry[]>(initialEntries);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [quickCapture, setQuickCapture] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ResearchEntry | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedEntry = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId]
  );

  const filteredEntries = useMemo(() => {
    if (!filter.trim()) return entries;
    const q = filter.toLowerCase();
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.topic.toLowerCase().includes(q) ||
        (e.summary?.toLowerCase().includes(q) ?? false)
    );
  }, [entries, filter]);

  const handleQuickCapture = useCallback(() => {
    const note = quickCapture.trim();
    if (!note) return;
    // Use the first 60 chars as title, rest as summary
    const title = note.length > 60 ? `${note.slice(0, 57)}…` : note;
    startTransition(async () => {
      const r = await createResearchEntry({
        title,
        topic: title,
        category: 'general',
        summary: note,
        research_date: new Date().toISOString().split('T')[0],
      });
      if (!r.success) {
        toast.error(r.error || 'Failed to save');
        return;
      }
      const created = (r as { success: true; data?: ResearchEntry }).data;
      if (created) {
        setEntries((prev) => [created, ...prev]);
      }
      setQuickCapture('');
      toast.success('Saved');
    });
  }, [quickCapture]);

  const handleDelete = useCallback(() => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    if (selectedId === target.id) setSelectedId(null);
    // Optimistic
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
  }, [pendingDelete, selectedId, entries]);

  return (
    <div className="flex flex-1 overflow-hidden">
      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden p-6 transition-all duration-300 lg:p-8',
          selectedEntry && 'lg:pr-0'
        )}
      >
        {/* Header */}
        <div className="mb-5 flex flex-shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <FlaskConical className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Research Hub</h1>
              <p className="text-sm text-muted-foreground">
                Capture, organize, and connect insights · {entries.length}{' '}
                {entries.length === 1 ? 'entry' : 'entries'}
              </p>
            </div>
          </div>
          <Button onClick={() => setShowNewDialog(true)} className="h-10 gap-2 rounded-xl px-4">
            <Plus className="h-4 w-4" />
            New Entry
          </Button>
        </div>

        {/* Quick Capture */}
        <div className="mb-5 flex-shrink-0">
          <div className="relative">
            <Sparkles className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            <Input
              placeholder="Quick capture: paste a link, note, or idea…"
              value={quickCapture}
              onChange={(e) => setQuickCapture(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleQuickCapture();
              }}
              disabled={isPending}
              className="h-12 rounded-xl border-border bg-card pl-11 pr-24"
            />
            <Button
              size="sm"
              onClick={handleQuickCapture}
              disabled={isPending || !quickCapture.trim()}
              className="absolute right-2 top-1/2 h-8 -translate-y-1/2 rounded-lg"
            >
              Save
            </Button>
          </div>
        </div>

        {/* Feed */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="mb-4 flex flex-shrink-0 items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold">Recent Research</h2>
              <Badge variant="secondary" className="rounded-full">
                {filteredEntries.length}
              </Badge>
            </div>
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-8 rounded-lg border-transparent bg-muted/30 pl-9 text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {filteredEntries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                {entries.length === 0
                  ? 'No research yet. Use Quick Capture above or click New Entry to add the first one.'
                  : 'No entries match the filter.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredEntries.map((entry) => {
                  const trending = isTrending(entry.created_at);
                  const sources = sourceCount(entry.sources);
                  const summary = entry.summary ?? entry.topic;
                  return (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedId(entry.id)}
                      className={cn(
                        'group w-full rounded-xl border border-border bg-card p-5 text-left transition-all',
                        'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--elevation-floating)] active:scale-[0.99]',
                        selectedId === entry.id && 'border-primary bg-primary/5'
                      )}
                    >
                      <div className="mb-3 flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            {trending && (
                              <Badge className="gap-1 border-orange-500/20 bg-orange-500/10 text-[10px] text-orange-500">
                                <TrendingUp className="h-3 w-3" />
                                Trending
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px]">
                              {getCategoryLabel(entry.category)}
                            </Badge>
                          </div>
                          <h3 className="line-clamp-1 font-semibold transition-colors group-hover:text-primary">
                            {entry.title}
                          </h3>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>

                      <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                        {summary}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(entry.research_date), 'MMM d')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {readingMinutes(entry.summary || entry.raw_content)}
                        </span>
                        {sources > 0 && (
                          <span className="flex items-center gap-1">
                            <Link2 className="h-3 w-3" />
                            {sources} source{sources === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selectedEntry && (
        <aside className="hidden w-[420px] flex-col border-l border-border bg-card/50 lg:flex">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {getCategoryLabel(selectedEntry.category)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {readingMinutes(selectedEntry.summary || selectedEntry.raw_content)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:bg-red-500/10 hover:text-red-500"
                  onClick={() => setPendingDelete(selectedEntry)}
                  aria-label="Delete entry"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSelectedId(null)}
                aria-label="Close detail panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <h2 className="mb-3 text-xl font-semibold">{selectedEntry.title}</h2>

            <div className="mb-5 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(selectedEntry.research_date), 'MMM d, yyyy')}
              </span>
              {sourceCount(selectedEntry.sources) > 0 && (
                <span className="flex items-center gap-1">
                  <Link2 className="h-3.5 w-3.5" />
                  {sourceCount(selectedEntry.sources)} sources
                </span>
              )}
            </div>

            {selectedEntry.summary && (
              <p className="mb-6 whitespace-pre-wrap text-sm text-muted-foreground">
                {selectedEntry.summary}
              </p>
            )}

            {splitInsights(selectedEntry.key_findings).length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Key Findings
                </h3>
                <div className="space-y-2">
                  {splitInsights(selectedEntry.key_findings).map((insight, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-lg bg-muted/30 p-3"
                    >
                      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {i + 1}
                      </div>
                      <span className="text-sm">{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedEntry.action_items && (
              <div className="mb-6">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Zap className="h-4 w-4 text-primary" />
                  Action Items
                </h3>
                <p className="whitespace-pre-wrap rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
                  {selectedEntry.action_items}
                </p>
              </div>
            )}

            {selectedEntry.sources && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold">Sources</h3>
                <div className="space-y-1.5">
                  {selectedEntry.sources
                    .split('\n')
                    .filter((s) => s.trim())
                    .map((s, i) => {
                      const url = s.match(/(https?:\/\/[^\s<>"{}|\\^`[\]]+)/)?.[1];
                      return (
                        <div
                          key={i}
                          className="flex items-start gap-2 rounded-lg bg-muted/30 p-2.5 text-xs"
                        >
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-1 items-center gap-2 text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{url}</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground">{s}</span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {selectedEntry.author && (
              <div className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
                Captured by {selectedEntry.author.full_name ?? selectedEntry.author.email}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* New entry dialog */}
      <NewEntryDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onCreated={(created) => setEntries((prev) => [created, ...prev])}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this research entry?"
        description={
          pendingDelete ? `"${pendingDelete.title}" will be permanently deleted.` : ''
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

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
            Capture findings from a topic you researched. Markdown supported.
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
              placeholder="What's the gist?"
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
