'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Search,
  Star,
  Clock,
  ChevronRight,
  X,
  Lightbulb,
  Copy,
  CheckCircle2,
  Play,
  BookMarked,
  Compass,
  Zap,
  FileText,
  Code2,
  Wrench,
  ListChecks,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Guide, GuideCategory } from '@/lib/guides-data';
import { toast } from 'sonner';

interface QualiaKnowledgeViewProps {
  guides: Guide[];
}

const STORAGE_BOOKMARKS = 'qualia.knowledge.bookmarks';
const STORAGE_RECENT = 'qualia.knowledge.recent';
const STORAGE_COMPLETED = 'qualia.knowledge.completed';

const CATEGORY_META: Record<
  GuideCategory,
  { label: string; icon: React.ElementType; color: string }
> = {
  foundations: {
    label: 'Foundations',
    icon: Compass,
    color: 'bg-emerald-500/10 text-emerald-500',
  },
  lifecycle: { label: 'Lifecycle', icon: Zap, color: 'bg-blue-500/10 text-blue-500' },
  operations: {
    label: 'Operations',
    icon: Wrench,
    color: 'bg-purple-500/10 text-purple-500',
  },
  reference: {
    label: 'Reference',
    icon: Code2,
    color: 'bg-amber-500/10 text-amber-500',
  },
  checklist: {
    label: 'Checklists',
    icon: ListChecks,
    color: 'bg-rose-500/10 text-rose-500',
  },
};

function readingMinutes(guide: Guide): string {
  // Rough estimate: ~12 lines of step content per minute
  const stepLines = guide.steps.reduce(
    (n, s) => n + (s.description?.split(/\s+/).length ?? 0),
    0
  );
  return `${Math.max(2, Math.ceil(stepLines / 200))} min`;
}

function loadStringSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveStringSet(key: string, set: Set<string>): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify([...set]));
}

export function QualiaKnowledgeView({ guides }: QualiaKnowledgeViewProps) {
  const [selected, setSelected] = useState<Guide | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [recent, setRecent] = useState<string[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    setBookmarks(loadStringSet(STORAGE_BOOKMARKS));
    setCompleted(loadStringSet(STORAGE_COMPLETED));
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(STORAGE_RECENT);
        const arr = raw ? (JSON.parse(raw) as string[]) : [];
        setRecent(Array.isArray(arr) ? arr : []);
      } catch {
        setRecent([]);
      }
    }
  }, []);

  // Slash-key focuses the search box like the v0 reference
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        document.getElementById('knowledge-search')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSelect = (g: Guide) => {
    setSelected(g);
    setRecent((prev) => {
      const next = [g.slug, ...prev.filter((s) => s !== g.slug)].slice(0, 5);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_RECENT, JSON.stringify(next));
      }
      return next;
    });
  };

  const toggleBookmark = (slug: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      saveStringSet(STORAGE_BOOKMARKS, next);
      return next;
    });
  };

  const toggleComplete = (slug: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      const isNowComplete = !next.has(slug);
      if (isNowComplete) {
        next.add(slug);
        toast.success('Marked complete');
      } else {
        next.delete(slug);
      }
      saveStringSet(STORAGE_COMPLETED, next);
      return next;
    });
  };

  const filteredGuides = useMemo(() => {
    if (!searchQuery.trim()) return guides;
    const q = searchQuery.toLowerCase();
    return guides.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.subtitle.toLowerCase().includes(q) ||
        g.steps.some(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            (s.description?.toLowerCase().includes(q) ?? false)
        )
    );
  }, [guides, searchQuery]);

  const quickAccess = useMemo(() => {
    // Bookmarked first, then 3 first foundations as a sensible default
    const bookmarked = guides.filter((g) => bookmarks.has(g.slug));
    if (bookmarked.length >= 3) return bookmarked.slice(0, 3);
    const seen = new Set(bookmarked.map((g) => g.slug));
    const fillers = guides
      .filter((g) => g.category === 'foundations' && !seen.has(g.slug))
      .slice(0, 3 - bookmarked.length);
    return [...bookmarked, ...fillers];
  }, [guides, bookmarks]);

  const recentlyViewed = useMemo(() => {
    return recent
      .map((slug) => guides.find((g) => g.slug === slug))
      .filter((g): g is Guide => !!g)
      .slice(0, 5);
  }, [recent, guides]);

  const categoryGroups = useMemo(() => {
    const groups: Array<{ key: GuideCategory; count: number }> = [];
    for (const cat of Object.keys(CATEGORY_META) as GuideCategory[]) {
      const count = guides.filter((g) => g.category === cat).length;
      if (count > 0) groups.push({ key: cat, count });
    }
    return groups;
  }, [guides]);

  const completedInFoundations = useMemo(
    () => guides.filter((g) => g.category === 'foundations' && completed.has(g.slug)).length,
    [guides, completed]
  );
  const totalFoundations = useMemo(
    () => guides.filter((g) => g.category === 'foundations').length,
    [guides]
  );
  const resumeGuide = useMemo(
    () =>
      guides.find((g) => g.category === 'foundations' && !completed.has(g.slug)) ??
      guides.find((g) => g.category === 'foundations'),
    [guides, completed]
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden p-6 transition-all duration-300 lg:p-8',
          selected && 'lg:pr-0'
        )}
      >
        {/* Header */}
        <div className="mb-5 flex flex-shrink-0 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Knowledge Base</h1>
              <p className="text-sm text-muted-foreground">
                Search or browse documentation · {guides.length} guides
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="knowledge-search"
              placeholder="Search documentation…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 rounded-xl border-border bg-card pl-11 text-base"
            />
            <kbd className="absolute right-4 top-1/2 hidden h-6 -translate-y-1/2 items-center rounded border bg-muted px-2 font-mono text-xs text-muted-foreground sm:inline-flex">
              /
            </kbd>
          </div>
        </div>

        {/* Body grid */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-hidden lg:grid-cols-3">
          {/* Left col: Quick Access + Recently Viewed */}
          <div className="flex min-h-0 flex-col gap-5 overflow-hidden lg:col-span-2">
            {/* Quick Access */}
            <div className="flex-shrink-0">
              <div className="mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold">
                  {bookmarks.size > 0 ? 'Bookmarked' : 'Quick Access'}
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {quickAccess.map((g) => {
                  const meta = CATEGORY_META[g.category];
                  const Icon = meta.icon;
                  const isBookmarked = bookmarks.has(g.slug);
                  return (
                    <button
                      key={g.slug}
                      onClick={() => handleSelect(g)}
                      className={cn(
                        'group rounded-xl border border-border bg-card p-4 text-left transition-all',
                        'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--elevation-floating)]',
                        selected?.slug === g.slug && 'border-primary bg-primary/5'
                      )}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className={cn(
                            'rounded-lg p-1.5',
                            isBookmarked ? 'bg-amber-500/10 text-amber-500' : meta.color
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {meta.label}
                        </Badge>
                        {completed.has(g.slug) && (
                          <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-500" />
                        )}
                      </div>
                      <h3 className="line-clamp-1 text-sm font-medium transition-colors group-hover:text-primary">
                        {g.title}
                      </h3>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {g.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* All / Search Results / Recently Viewed */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="mb-3 flex flex-shrink-0 items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">
                  {searchQuery ? `Results (${filteredGuides.length})` : 'Recently Viewed'}
                </h2>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto">
                {searchQuery ? (
                  filteredGuides.length === 0 ? (
                    <p className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
                      No guides match your search.
                    </p>
                  ) : (
                    filteredGuides.map((g) => (
                      <GuideRow
                        key={g.slug}
                        guide={g}
                        completed={completed.has(g.slug)}
                        onSelect={() => handleSelect(g)}
                      />
                    ))
                  )
                ) : recentlyViewed.length === 0 ? (
                  <p className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
                    Open a guide to see it here.
                  </p>
                ) : (
                  recentlyViewed.map((g) => (
                    <GuideRow
                      key={g.slug}
                      guide={g}
                      completed={completed.has(g.slug)}
                      onSelect={() => handleSelect(g)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right col: Progress + Categories */}
          <div className="flex min-h-0 flex-col gap-5 overflow-hidden">
            {/* Progress */}
            <div className="flex-shrink-0 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-4">
              <div className="mb-3 flex items-center gap-2">
                <BookMarked className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Your Progress</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-4 border-primary/30">
                  <span className="text-sm font-bold">{completedInFoundations}</span>
                  <span className="absolute -bottom-3 text-[8px] text-muted-foreground">
                    /{totalFoundations}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Foundations</p>
                  <p className="text-xs text-muted-foreground">
                    {resumeGuide ? 'Continue where you left off' : 'All caught up'}
                  </p>
                </div>
                {resumeGuide && (
                  <Button
                    size="sm"
                    className="h-8 gap-1 rounded-lg"
                    onClick={() => handleSelect(resumeGuide)}
                  >
                    <Play className="h-3 w-3" />
                    Resume
                  </Button>
                )}
              </div>
            </div>

            {/* Categories */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <h2 className="mb-3 flex-shrink-0 text-sm font-semibold">Browse by Category</h2>
              <div className="flex-1 space-y-2 overflow-y-auto">
                {categoryGroups.map(({ key, count }) => {
                  const meta = CATEGORY_META[key];
                  const Icon = meta.icon;
                  const firstInCat = guides.find((g) => g.category === key);
                  return (
                    <button
                      key={key}
                      onClick={() => firstInCat && handleSelect(firstInCat)}
                      className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--elevation-floating)]"
                    >
                      <span className={cn('rounded-lg p-2', meta.color)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium transition-colors group-hover:text-primary">
                          {meta.label}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {count} {count === 1 ? 'guide' : 'guides'}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <aside className="hidden w-[420px] flex-col border-l border-border bg-card/50 lg:flex">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {CATEGORY_META[selected.category].label}
              </Badge>
              <span className="text-xs text-muted-foreground">{readingMinutes(selected)}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSelected(null)}
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <h2 className="mb-2 text-xl font-semibold">{selected.title}</h2>
            <p className="mb-6 text-sm text-muted-foreground">{selected.subtitle}</p>

            <div className="space-y-6">
              {selected.steps.map((step, idx) => (
                <div key={step.id}>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {idx + 1}
                    </div>
                    <h3 className="font-semibold">{step.title}</h3>
                    {step.isMilestone && (
                      <Badge
                        variant="outline"
                        className="border-amber-500/30 bg-amber-500/10 text-[9px] text-amber-500"
                      >
                        Milestone
                      </Badge>
                    )}
                  </div>
                  {step.description && (
                    <p className="mb-3 ml-9 whitespace-pre-wrap text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  )}

                  {step.tips && step.tips.length > 0 && (
                    <div className="mb-3 ml-9 space-y-2">
                      {step.tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <Lightbulb className="mt-0.5 h-3.5 w-3.5 text-amber-500" />
                          <span className="text-muted-foreground">{tip}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {step.commands && step.commands.length > 0 && (
                    <CodeBlock label="Commands" content={step.commands.join('\n')} />
                  )}

                  {step.example && (
                    <CodeBlock label={step.exampleTitle ?? 'Example'} content={step.example} />
                  )}

                  {step.warning && (
                    <div className="ml-9 mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                      ⚠ {step.warning}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selected.checklist && (
              <div className="mt-8 border-t border-border pt-5">
                <h3 className="mb-3 text-sm font-semibold">{selected.checklist.title}</h3>
                <ul className="space-y-1.5">
                  {selected.checklist.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500/70" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-shrink-0 items-center gap-3 border-t border-border p-4">
            <Button
              variant="outline"
              className={cn(
                'h-10 flex-1 gap-2 rounded-xl',
                bookmarks.has(selected.slug) &&
                  'border-amber-500/40 text-amber-500 hover:bg-amber-500/10'
              )}
              onClick={() => toggleBookmark(selected.slug)}
            >
              <Star
                className={cn(
                  'h-4 w-4',
                  bookmarks.has(selected.slug) ? 'fill-amber-500 text-amber-500' : ''
                )}
              />
              {bookmarks.has(selected.slug) ? 'Bookmarked' : 'Bookmark'}
            </Button>
            <Button
              className={cn(
                'h-10 flex-1 gap-2 rounded-xl transition-all',
                completed.has(selected.slug) &&
                  'bg-emerald-500 text-white hover:bg-emerald-500/90'
              )}
              onClick={() => toggleComplete(selected.slug)}
            >
              <CheckCircle2 className="h-4 w-4" />
              {completed.has(selected.slug) ? 'Completed' : 'Mark Complete'}
            </Button>
          </div>
        </aside>
      )}
    </div>
  );
}

function GuideRow({
  guide,
  completed,
  onSelect,
}: {
  guide: Guide;
  completed: boolean;
  onSelect: () => void;
}) {
  const meta = CATEGORY_META[guide.category];
  const Icon = meta.icon;
  return (
    <button
      onClick={onSelect}
      className="group flex w-full items-center gap-4 rounded-lg p-3 text-left transition-colors hover:bg-muted/50 active:scale-[0.99]"
    >
      <span className={cn('rounded-lg p-2', meta.color)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium transition-colors group-hover:text-primary">
          {guide.title}
        </h3>
        <p className="text-xs text-muted-foreground">{readingMinutes(guide)} read</p>
      </div>
      {completed && <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />}
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
    </button>
  );
}

function CodeBlock({ label, content }: { label: string; content: string }) {
  return (
    <div className="ml-9 mb-3 overflow-hidden rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-1.5">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={() => {
            navigator.clipboard.writeText(content);
            toast.success('Copied to clipboard');
          }}
          aria-label="Copy"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      <pre className="whitespace-pre-wrap break-all p-3 font-mono text-xs text-muted-foreground">
        {content}
      </pre>
    </div>
  );
}

// Avoid an unused-imports lint warning while keeping FileText importable
// for future per-step file-output styling.
void FileText;
