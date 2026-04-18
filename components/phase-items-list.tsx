'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { ChevronRight, CircleCheck, CircleDashed, FileText, Loader2 } from 'lucide-react';
import { getPhaseItems, type FrameworkPhaseItem } from '@/app/actions/phases';
import { cn } from '@/lib/utils';

interface PhaseItemsListProps {
  phaseId: string;
  className?: string;
}

function isDone(item: FrameworkPhaseItem): boolean {
  return item.is_completed === true || item.status === 'Done';
}

/**
 * Extract the source plan filename from a framework-synced item's template_key.
 * Shape: `{planFile}#task{N}` (e.g. `18-02-PLAN.md#task3`). Returns the
 * filename or `null` for custom/ad-hoc items.
 */
function parsePlanSource(item: FrameworkPhaseItem): string | null {
  if (!item.template_key) return null;
  const hashIdx = item.template_key.indexOf('#');
  if (hashIdx <= 0) return null;
  return item.template_key.slice(0, hashIdx);
}

function ItemRow({
  item,
  expanded,
  onToggle,
}: {
  item: FrameworkPhaseItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const done = isDone(item);
  const hasBody = !!item.description;
  return (
    <li
      className={cn(
        'rounded-md border border-transparent px-2 py-1.5 text-sm transition-colors',
        hasBody && 'cursor-pointer hover:border-border hover:bg-muted/30',
        done && 'opacity-60'
      )}
      onClick={() => {
        if (hasBody) onToggle();
      }}
    >
      <div className="flex items-start gap-2">
        {done ? (
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
        ) : (
          <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />
        )}
        <span
          className={cn(
            'min-w-0 flex-1',
            done ? 'text-muted-foreground line-through' : 'text-foreground'
          )}
        >
          {item.title}
        </span>
        {hasBody && (
          <ChevronRight
            className={cn(
              'mt-0.5 size-4 shrink-0 text-muted-foreground/50 transition-transform',
              expanded && 'rotate-90'
            )}
          />
        )}
      </div>
      {expanded && hasBody && (
        <pre className="ml-6 mt-1.5 whitespace-pre-wrap break-words rounded bg-muted/30 p-2 text-[11px] leading-relaxed text-muted-foreground">
          {item.description}
        </pre>
      )}
    </li>
  );
}

export function PhaseItemsList({ phaseId, className }: PhaseItemsListProps) {
  const [items, setItems] = useState<FrameworkPhaseItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await getPhaseItems(phaseId);
      setItems(data);
      setLoaded(true);
    });
  }, [phaseId]);

  const frameworkItems = useMemo(() => items.filter((i) => !i.is_custom), [items]);

  // Group by source plan file (preserves encounter order → preserves
  // display_order ordering, since phase_items is already sorted by it).
  const groupedByPlan = useMemo(() => {
    const groups = new Map<string, FrameworkPhaseItem[]>();
    for (const item of frameworkItems) {
      const key = parsePlanSource(item) ?? 'Framework Tasks';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return Array.from(groups.entries());
  }, [frameworkItems]);

  if (!loaded && isPending) {
    return (
      <div className={cn('flex items-center gap-2 p-4 text-xs text-muted-foreground', className)}>
        <Loader2 className="size-3 animate-spin" />
        Loading framework tasks…
      </div>
    );
  }

  if (frameworkItems.length === 0) return null;

  const doneCount = frameworkItems.filter(isDone).length;
  const totalCount = frameworkItems.length;
  const multiplePlans = groupedByPlan.length > 1;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Framework Tasks
        <span className="rounded bg-muted/50 px-1.5 py-px text-[10px] font-normal text-muted-foreground/80">
          from PLAN.md
        </span>
        <span className="tabular-nums text-muted-foreground/60">
          {doneCount}/{totalCount}
        </span>
      </div>

      {multiplePlans ? (
        <div className="space-y-3">
          {groupedByPlan.map(([planFile, planItems]) => {
            const planDone = planItems.filter(isDone).length;
            return (
              <section key={planFile} className="rounded-lg border border-border bg-muted/10 p-2">
                <header className="mb-1 flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
                  <FileText className="size-3 opacity-60" />
                  <code className="font-mono">{planFile}</code>
                  <span className="tabular-nums text-muted-foreground/60">
                    {planDone}/{planItems.length}
                  </span>
                </header>
                <ol className="space-y-px">
                  {planItems.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      expanded={expandedId === item.id}
                      onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    />
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      ) : (
        <ol className="space-y-px">
          {frameworkItems.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
