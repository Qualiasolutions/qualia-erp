'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClientAccessDriftRow } from '@/app/actions/clients';

interface ClientAccessDriftBannerProps {
  rows: ClientAccessDriftRow[];
}

const KIND_LABEL: Record<ClientAccessDriftRow['kind'], string> = {
  project_owned_no_portal_access: 'Owned · no portal access',
  portal_access_owner_mismatch: 'Portal/owner mismatch',
  portal_access_to_archived_project: 'Access to archived project',
};

export function ClientAccessDriftBanner({ rows }: ClientAccessDriftBannerProps) {
  const [expanded, setExpanded] = useState(false);
  if (rows.length === 0) return null;

  return (
    <section
      className="overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/[0.05]"
      role="alert"
      aria-labelledby="drift-banner-title"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'flex w-full items-center justify-between gap-3 px-4 py-3 text-left',
          'transition-colors hover:bg-amber-500/[0.08]'
        )}
        aria-expanded={expanded}
      >
        <div className="flex min-w-0 items-center gap-3">
          <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0">
            <h2
              id="drift-banner-title"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Client/project access drift detected
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {rows.length} project link{rows.length === 1 ? '' : 's'} where ownership (
              <code className="font-mono text-[10px]">projects.client_id</code>) and portal access (
              <code className="font-mono text-[10px]">client_projects</code>) disagree.
            </p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-amber-700 dark:text-amber-400">
          {expanded ? 'Collapse' : 'Show'}
          {expanded ? (
            <ChevronUp className="size-3.5" aria-hidden />
          ) : (
            <ChevronDown className="size-3.5" aria-hidden />
          )}
        </span>
      </button>

      {expanded && (
        <ul className="divide-y divide-amber-500/20 border-t border-amber-500/20 bg-background/40">
          {rows.map((row, i) => (
            <li
              key={`${row.projectId}-${row.kind}-${i}`}
              className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-xs"
            >
              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300">
                {KIND_LABEL[row.kind]}
              </span>
              <Link
                href={`/projects/${row.projectId}`}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {row.projectName}
              </Link>
              {row.clientId && (
                <Link
                  href={`/clients/${row.clientId}`}
                  className="text-muted-foreground underline-offset-4 hover:underline"
                >
                  · {row.clientName ?? 'client'}
                </Link>
              )}
              <span className="min-w-0 flex-1 text-muted-foreground">{row.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
