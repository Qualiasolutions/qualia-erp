'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { Search, Sparkles, AlertCircle, FileText, Folder, Activity } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';

import { cn } from '@/lib/utils';
import { searchBrain, type BrainHit, type BrainSearchResult } from '@/app/actions/brain';

type SourceFilter = 'all' | BrainHit['source'];

const SOURCE_LABEL: Record<BrainHit['source'], string> = {
  session_report: 'Reports',
  project: 'Projects',
  activity: 'Activity',
};

const SOURCE_ICON: Record<BrainHit['source'], React.ComponentType<{ className?: string }>> = {
  session_report: FileText,
  project: Folder,
  activity: Activity,
};

export function BrainView() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [filter, setFilter] = useState<SourceFilter>('all');
  const [result, setResult] = useState<BrainSearchResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+K / Ctrl+K to focus the search input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = useCallback((q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    setSubmitted(trimmed);
    startTransition(async () => {
      const res = await searchBrain(trimmed);
      setResult(res);
    });
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(query);
  };

  const filteredHits = useMemo(() => {
    if (!result || !result.ok) return [];
    if (filter === 'all') return result.hits;
    return result.hits.filter((h) => h.source === filter);
  }, [result, filter]);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            Qualia Brain
          </span>
          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-700 dark:text-amber-400">
            V1
          </span>
        </div>
        <h1 className="text-[clamp(1.5rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight">
          Ask the corpus
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Keyword search across session reports, project descriptions, and client activity. Press{' '}
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd> anywhere to
          focus this box. Semantic search and meeting transcripts coming next.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What did we promise Maison Maud about delivery?"
            autoFocus
            className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'session_report', 'project', 'activity'] as const).map((src) => {
            const active = filter === src;
            const count =
              src === 'all'
                ? result && result.ok
                  ? result.hits.length
                  : 0
                : result && result.ok
                  ? result.counts[src]
                  : 0;
            return (
              <button
                key={src}
                type="button"
                onClick={() => setFilter(src)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{src === 'all' ? 'All' : SOURCE_LABEL[src]}</span>
                {result && result.ok ? (
                  <span className="font-mono text-[10px] tabular-nums">{count}</span>
                ) : null}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
            {isPending ? (
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-3.5 animate-pulse text-primary" aria-hidden />
                searching…
              </span>
            ) : submitted ? (
              <span>
                results for <span className="text-foreground">“{submitted}”</span>
              </span>
            ) : null}
          </div>
        </div>
      </form>

      {/* Empty state */}
      {!result && !isPending ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <Sparkles className="mx-auto mb-3 size-6 text-muted-foreground/50" aria-hidden />
          <p className="text-sm text-foreground">Type a question or keyword.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try: <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">Sakani</code> ·{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">deadline</code> ·{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">verification fail</code>
          </p>
        </div>
      ) : null}

      {/* Error state */}
      {result && !result.ok ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4">
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400"
              aria-hidden
            />
            <div>
              <p className="text-sm font-semibold text-foreground">Search failed</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{result.error}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Results */}
      {result && result.ok ? (
        filteredHits.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-foreground">
              No matches in{' '}
              {filter === 'all' ? 'any source' : SOURCE_LABEL[filter as BrainHit['source']]}.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try a shorter query or switch sources.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {filteredHits.map((hit) => (
              <BrainHitCard key={hit.id} hit={hit} query={result.query} />
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}

function BrainHitCard({ hit, query }: { hit: BrainHit; query: string }) {
  const Icon = SOURCE_ICON[hit.source];
  const className = cn(
    'group block rounded-xl border border-border bg-card p-4 transition-colors',
    hit.href ? 'cursor-pointer hover:border-primary/40 hover:bg-card/80' : 'cursor-default'
  );
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
            aria-hidden
          >
            <Icon className="size-3.5" />
          </span>
          <h3 className="truncate text-sm font-semibold text-foreground">{hit.title}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
            {SOURCE_LABEL[hit.source]}
          </span>
          {hit.occurredAt ? (
            <span className="font-mono text-[10px] text-muted-foreground">
              {formatDistanceToNowStrict(new Date(hit.occurredAt), { addSuffix: false })}
            </span>
          ) : null}
        </div>
      </div>
      {hit.context ? (
        <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{hit.context}</p>
      ) : null}
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        <HighlightedSnippet text={hit.snippet} query={query} />
      </p>
    </>
  );
  return (
    <li>
      {hit.href ? (
        <Link href={hit.href} className={className}>
          {inner}
        </Link>
      ) : (
        <div className={className}>{inner}</div>
      )}
    </li>
  );
}

function HighlightedSnippet({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(re);

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={`${part}:${index}`} className="rounded bg-primary/20 px-0.5 text-foreground">
            {part}
          </mark>
        ) : (
          <span key={`${part}:${index}`}>{part}</span>
        )
      )}
    </>
  );
}
