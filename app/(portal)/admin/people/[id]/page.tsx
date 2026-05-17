import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { ArrowLeft, ExternalLink } from 'lucide-react';

import { getPersonDetail } from '@/app/actions/admin-control/people';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuditDeepView } from '@/components/employee-audit/audit-deep-view';
import type { PersonDetailPayload } from '@/app/actions/admin-control/people';

export const metadata: Metadata = {
  title: 'Person detail | Admin · Qualia',
  robots: { index: false, follow: false },
};

const VALID_TABS = new Set(['profile', 'attendance', 'audit', 'assignments']);

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function PersonDetailPage({ params, searchParams }: PageProps) {
  await connection();

  const { id } = await params;
  const { tab: tabRaw } = await searchParams;
  const tab = tabRaw && VALID_TABS.has(tabRaw) ? tabRaw : 'profile';

  const person = await getPersonDetail(id);
  if (!person) notFound();

  if (person.kind === 'client') {
    return <ClientDetail person={person} defaultTab={tab} />;
  }

  return <ProfileDetail person={person} defaultTab={tab} />;
}

/* ------------------------------------------------------------------
 * Profile detail (admin/employee)
 * ------------------------------------------------------------------ */

function ProfileDetail({
  person,
  defaultTab,
}: {
  person: Extract<PersonDetailPayload, { kind: 'profile' }>;
  defaultTab: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
      <header className="flex flex-col gap-2">
        <Link
          href="/admin/people"
          className="inline-flex w-fit items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to people
        </Link>
        <div className="flex items-center gap-4">
          {person.avatarUrl ? (
            <img src={person.avatarUrl} alt="" className="size-12 rounded-full object-cover" />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <span className="text-lg font-semibold text-primary">
                {(person.fullName || person.email || '?')[0].toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <h1 className="text-[clamp(1.5rem,1.2rem+1.4vw,2.25rem)] font-semibold tracking-tight">
              {person.fullName ?? 'Unnamed'}
            </h1>
            <p className="text-sm text-muted-foreground">{person.email ?? '—'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {person.role ?? '—'}
          </span>
          {person.workspaceName && (
            <span className="text-[12px] text-muted-foreground">{person.workspaceName}</span>
          )}
        </div>
      </header>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileTab person={person} />
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <AttendanceTab person={person} />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AuditTab person={person} />
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          <AssignmentsTab person={person} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Profile tab
 * ------------------------------------------------------------------ */

function ProfileTab({ person }: { person: Extract<PersonDetailPayload, { kind: 'profile' }> }) {
  const fields = [
    { label: 'Full name', value: person.fullName },
    { label: 'Email', value: person.email },
    { label: 'Role', value: person.role },
    { label: 'Workspace', value: person.workspaceName },
  ];

  return (
    <div className="rounded-xl border border-border bg-card/40">
      {fields.map((f, i) => (
        <div
          key={f.label}
          className={`flex items-baseline justify-between gap-4 px-5 py-3.5 ${i > 0 ? 'border-t border-border' : ''}`}
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {f.label}
          </span>
          <span className="text-sm text-foreground">{f.value ?? '—'}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------
 * Attendance tab
 * ------------------------------------------------------------------ */

function AttendanceTab({ person }: { person: Extract<PersonDetailPayload, { kind: 'profile' }> }) {
  const { attendance } = person;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total sessions" value={String(attendance.totalSessions)} />
        <StatCard label="Total hours" value={`${attendance.totalHours}h`} />
        <StatCard label="Distinct workdays" value={String(attendance.distinctWorkdays)} />
        <StatCard label="Last 30d sessions" value={String(attendance.last30dSessions)} />
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-5">
        <p className="text-sm text-muted-foreground">
          For a detailed view of work sessions, clock-in/out times, and project-level breakdown,
          visit the{' '}
          <Link
            href={`/admin/attendance?profile=${person.id}&date=30d`}
            className="font-medium text-primary hover:underline"
          >
            full attendance log
          </Link>{' '}
          filtered to this person.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Audit tab
 * ------------------------------------------------------------------ */

function AuditTab({ person }: { person: Extract<PersonDetailPayload, { kind: 'profile' }> }) {
  if (!person.audit) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
        <p className="text-sm text-muted-foreground">No audit data available for this person.</p>
        <Link href={`/audit/${person.id}`} className="mt-3 text-sm text-primary hover:underline">
          Send them the self-assessment form
        </Link>
      </div>
    );
  }

  return <AuditDeepView audit={person.audit} profileId={person.id} />;
}

/* ------------------------------------------------------------------
 * Assignments tab
 * ------------------------------------------------------------------ */

function AssignmentsTab({ person }: { person: Extract<PersonDetailPayload, { kind: 'profile' }> }) {
  const { assignments } = person;

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
        <p className="text-sm text-muted-foreground">No active project assignments.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="overflow-hidden rounded-xl border border-border bg-card/40">
        {assignments.map((a, i) => (
          <li
            key={a.id}
            className={`flex items-center justify-between gap-4 px-5 py-3.5 ${i > 0 ? 'border-t border-border' : ''}`}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {a.projectName ?? 'Unknown project'}
              </span>
              {a.deadlineDate && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  Deadline: {a.deadlineDate}
                </span>
              )}
            </div>
            {a.assignedAt && (
              <span className="font-mono text-[11px] text-muted-foreground">
                Assigned{' '}
                {new Date(a.assignedAt).toLocaleDateString('en-IE', { dateStyle: 'medium' })}
              </span>
            )}
          </li>
        ))}
      </ul>

      <Link
        href="/admin/assignments"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-primary hover:underline"
      >
        Manage assignments
        <ExternalLink className="size-3.5" />
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Client detail
 * ------------------------------------------------------------------ */

function ClientDetail({
  person,
  defaultTab,
}: {
  person: Extract<PersonDetailPayload, { kind: 'client' }>;
  defaultTab: string;
}) {
  const resolvedTab =
    defaultTab === 'profile' || defaultTab === 'assignments' ? defaultTab : 'profile';

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
      <header className="flex flex-col gap-2">
        <Link
          href="/admin/people"
          className="inline-flex w-fit items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to people
        </Link>
        <div className="flex items-center gap-4">
          {person.logoUrl ? (
            <img src={person.logoUrl} alt="" className="size-12 rounded-full object-cover" />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <span className="text-lg font-semibold text-primary">
                {(person.displayName || '?')[0].toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <h1 className="text-[clamp(1.5rem,1.2rem+1.4vw,2.25rem)] font-semibold tracking-tight">
              {person.displayName ?? 'Unnamed client'}
            </h1>
            {person.phone && <p className="text-sm text-muted-foreground">{person.phone}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            client
          </span>
          {person.leadStatus && (
            <span className="text-[12px] text-muted-foreground">{person.leadStatus}</span>
          )}
        </div>
      </header>

      <Tabs defaultValue={resolvedTab} className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="assignments">Projects ({person.projects.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <div className="rounded-xl border border-border bg-card/40">
            {[
              { label: 'Display name', value: person.displayName },
              { label: 'Phone', value: person.phone },
              { label: 'Lead status', value: person.leadStatus },
            ].map((f, i) => (
              <div
                key={f.label}
                className={`flex items-baseline justify-between gap-4 px-5 py-3.5 ${i > 0 ? 'border-t border-border' : ''}`}
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  {f.label}
                </span>
                <span className="text-sm text-foreground">{f.value ?? '—'}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          {person.projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
              <p className="text-sm text-muted-foreground">
                No projects associated with this client.
              </p>
            </div>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-border bg-card/40">
              {person.projects.map((p, i) => (
                <li
                  key={p.id}
                  className={`flex items-center justify-between gap-4 px-5 py-3.5 ${i > 0 ? 'border-t border-border' : ''}`}
                >
                  <Link
                    href={`/projects/${p.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary"
                  >
                    {p.name}
                  </Link>
                  <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {p.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Shared stat card component
 * ------------------------------------------------------------------ */

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card/40 p-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-[clamp(1.25rem,0.9rem+1vw,1.75rem)] font-semibold tabular-nums tracking-tight">
        {value}
      </span>
    </div>
  );
}
