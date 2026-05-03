'use server';

import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/app/actions/shared';
import { getCurrentWorkspaceId } from '@/app/actions/workspace';

/**
 * Qualia Brain — keyword search across the operational corpus.
 *
 * V1 sources:
 *   - session_reports         (notes, project_name, milestone_name, phase_name)
 *   - projects + clients      (name, description)
 *   - client_activities       (title, description)
 *
 * V1 is keyword (ilike) search, not semantic. Future: embed corpus into
 * `documents` (pgvector) for semantic ranking.
 *
 * Multi-tenancy note: `session_reports` and `client_activities` lack a
 * `workspace_id` column, so the queries below do not filter by workspace.
 * Today this is a non-issue — Qualia is single-tenant. If multi-tenancy
 * ever lands, scope `session_reports` via `erp_project_id` (joined to
 * workspace-filtered projects) and `client_activities` via `client_id`.
 */

export type BrainHit = {
  id: string;
  source: 'session_report' | 'project' | 'activity';
  title: string;
  snippet: string;
  context: string;
  href: string | null;
  occurredAt: string | null;
};

export type BrainSearchResult =
  | { ok: true; query: string; hits: BrainHit[]; counts: Record<BrainHit['source'], number> }
  | { ok: false; error: string };

const MAX_HITS_PER_SOURCE = 12;
const SNIPPET_RADIUS = 80;

function snippetAround(haystack: string | null, needle: string): string {
  if (!haystack) return '';
  const idx = haystack.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return haystack.slice(0, 160);
  const start = Math.max(0, idx - SNIPPET_RADIUS);
  const end = Math.min(haystack.length, idx + needle.length + SNIPPET_RADIUS);
  const prefix = start > 0 ? '… ' : '';
  const suffix = end < haystack.length ? ' …' : '';
  return `${prefix}${haystack.slice(start, end).trim()}${suffix}`;
}

export async function searchBrain(query: string): Promise<BrainSearchResult> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: 'Query must be at least 2 characters.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isUserAdmin(user.id))) {
    return { ok: false, error: 'Brain is admin-only for now.' };
  }

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return { ok: false, error: 'No workspace.' };
  }

  // Escape % and _ for ilike, then wrap in wildcards
  const safe = trimmed.replace(/[%_]/g, '\\$&');
  const pattern = `%${safe}%`;

  const [reportsRes, projectsRes, activitiesRes] = await Promise.all([
    supabase
      .from('session_reports')
      .select(
        'id, project_name, milestone_name, phase_name, notes, submitted_at, submitted_by, deployed_url, client_report_id'
      )
      .neq('dry_run', true)
      .or(
        [
          `notes.ilike.${pattern}`,
          `project_name.ilike.${pattern}`,
          `milestone_name.ilike.${pattern}`,
          `phase_name.ilike.${pattern}`,
          `submitted_by.ilike.${pattern}`,
        ].join(',')
      )
      .order('submitted_at', { ascending: false })
      .limit(MAX_HITS_PER_SOURCE),

    supabase
      .from('projects')
      .select(
        `
        id, name, description, status, target_date, updated_at,
        client:clients!projects_client_id_fkey (id, name)
      `
      )
      .eq('workspace_id', workspaceId)
      .or([`name.ilike.${pattern}`, `description.ilike.${pattern}`].join(','))
      .order('updated_at', { ascending: false })
      .limit(MAX_HITS_PER_SOURCE),

    supabase
      .from('client_activities')
      .select(
        `
        id, type, description, created_at,
        client:clients!client_activities_client_id_fkey (id, name)
      `
      )
      .or([`type.ilike.${pattern}`, `description.ilike.${pattern}`].join(','))
      .order('created_at', { ascending: false })
      .limit(MAX_HITS_PER_SOURCE),
  ]);

  const hits: BrainHit[] = [];

  type ReportRaw = {
    id: string;
    project_name: string | null;
    milestone_name: string | null;
    phase_name: string | null;
    notes: string | null;
    submitted_at: string | null;
    submitted_by: string | null;
    deployed_url: string | null;
    client_report_id: string | null;
  };
  for (const r of (reportsRes.data as ReportRaw[] | null) ?? []) {
    hits.push({
      id: `report:${r.id}`,
      source: 'session_report',
      title: r.project_name ?? 'Session report',
      snippet: snippetAround(r.notes, trimmed) || 'No notes captured.',
      context: [r.client_report_id, r.milestone_name, r.phase_name, r.submitted_by]
        .filter(Boolean)
        .join(' · '),
      href: `/admin/reports?tab=framework&id=${r.id}`,
      occurredAt: r.submitted_at,
    });
  }

  type ProjectRaw = {
    id: string;
    name: string;
    description: string | null;
    status: string;
    target_date: string | null;
    updated_at: string | null;
    client: { id: string; name: string | null } | Array<{ id: string; name: string | null }> | null;
  };
  for (const p of (projectsRes.data as ProjectRaw[] | null) ?? []) {
    const client = Array.isArray(p.client) ? p.client[0] : p.client;
    hits.push({
      id: `project:${p.id}`,
      source: 'project',
      title: p.name,
      snippet:
        snippetAround(p.description, trimmed) ||
        `${p.status}${p.target_date ? ` · target ${p.target_date}` : ''}`,
      context: [client?.name, p.status].filter(Boolean).join(' · '),
      href: `/projects/${p.id}`,
      occurredAt: p.updated_at,
    });
  }

  type ActivityRaw = {
    id: string;
    type: string | null;
    description: string | null;
    created_at: string | null;
    client: { id: string; name: string | null } | Array<{ id: string; name: string | null }> | null;
  };
  for (const a of (activitiesRes.data as ActivityRaw[] | null) ?? []) {
    const client = Array.isArray(a.client) ? a.client[0] : a.client;
    hits.push({
      id: `activity:${a.id}`,
      source: 'activity',
      title: (a.type ?? 'activity').replace(/_/g, ' '),
      snippet: snippetAround(a.description, trimmed) || a.type || 'Activity',
      context: [client?.name, a.type].filter(Boolean).join(' · '),
      href: client?.id ? `/clients/${client.id}` : null,
      occurredAt: a.created_at,
    });
  }

  // Sort: newest first across sources
  hits.sort((a, b) => {
    const at = a.occurredAt ? Date.parse(a.occurredAt) : 0;
    const bt = b.occurredAt ? Date.parse(b.occurredAt) : 0;
    return bt - at;
  });

  const counts: Record<BrainHit['source'], number> = {
    session_report: 0,
    project: 0,
    activity: 0,
  };
  for (const h of hits) counts[h.source] += 1;

  return { ok: true, query: trimmed, hits, counts };
}
