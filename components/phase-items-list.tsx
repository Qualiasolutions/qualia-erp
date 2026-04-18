'use client';

import { useEffect, useState, useTransition } from 'react';
import { ChevronRight, CircleCheck, CircleDashed, Loader2 } from 'lucide-react';
import { getPhaseItems, type FrameworkPhaseItem } from '@/app/actions/phases';
import { cn } from '@/lib/utils';

interface PhaseItemsListProps {
  phaseId: string;
  className?: string;
}

function isDone(item: FrameworkPhaseItem): boolean {
  return item.is_completed === true || item.status === 'Done';
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

  const frameworkItems = items.filter((i) => !i.is_custom);
  const customItems = items.filter((i) => i.is_custom);

  if (!loaded && isPending) {
    return (
      <div className={cn('flex items-center gap-2 p-4 text-xs text-muted-foreground', className)}>
        <Loader2 className="size-3 animate-spin" />
        Loading framework tasks…
      </div>
    );
  }

  if (frameworkItems.length === 0 && customItems.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {frameworkItems.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Framework Tasks
            <span className="rounded bg-muted/50 px-1.5 py-px text-[10px] font-normal text-muted-foreground/80">
              from PLAN.md
            </span>
            <span className="tabular-nums text-muted-foreground/60">
              {frameworkItems.filter(isDone).length}/{frameworkItems.length}
            </span>
          </div>
          <ol className="space-y-px">
            {frameworkItems.map((item) => {
              const done = isDone(item);
              const open = expandedId === item.id;
              const hasBody = !!item.description;
              return (
                <li
                  key={item.id}
                  className={cn(
                    'rounded-md border border-transparent px-2 py-1.5 text-sm transition-colors',
                    hasBody && 'cursor-pointer hover:border-border hover:bg-muted/30',
                    done && 'opacity-60'
                  )}
                  onClick={() => {
                    if (hasBody) setExpandedId(open ? null : item.id);
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
                          open && 'rotate-90'
                        )}
                      />
                    )}
                  </div>
                  {open && hasBody && (
                    <pre className="ml-6 mt-1.5 whitespace-pre-wrap break-words rounded bg-muted/30 p-2 text-[11px] leading-relaxed text-muted-foreground">
                      {item.description}
                    </pre>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
