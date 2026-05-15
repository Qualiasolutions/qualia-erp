'use client';

import { useState, useTransition } from 'react';
import { AnimatePresence, m } from '@/lib/lazy-motion';
import { Sparkles, ScanSearch, TrendingUp, TrendingDown, Equal } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  analyzeAuditDrift,
  type EmployeeAuditPayload,
  type AuditDriftReport,
  type AuditDriftFinding,
} from '@/app/actions/employee-audit';

/* ======================================================================
   Stat tiles
   ====================================================================== */

function StatTile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'good' | 'warn' | 'bad';
}) {
  const toneCls = {
    default: 'border-border',
    good: 'border-emerald-500/40',
    warn: 'border-amber-500/40',
    bad: 'border-red-500/40',
  }[tone];

  return (
    <div className={cn('flex flex-col gap-1 rounded-xl border bg-card/40 p-4', toneCls)}>
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-[clamp(1.25rem,0.9rem+1vw,1.75rem)] font-semibold tabular-nums tracking-tight">
        {value}
      </span>
      {hint ? <span className="text-[12px] text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

/* ======================================================================
   Section header
   ====================================================================== */

function SectionHeader({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-4 flex flex-col gap-1">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
        {kicker}
      </span>
      <h2 className="text-[clamp(1.15rem,0.95rem+0.9vw,1.5rem)] font-semibold tracking-tight">
        {title}
      </h2>
    </div>
  );
}

/* ======================================================================
   Drift severity badge
   ====================================================================== */

function severityStyle(s: AuditDriftFinding['severity']) {
  switch (s) {
    case 'high':
      return {
        bar: 'bg-red-500',
        bg: 'bg-red-500/10',
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-500/30',
        icon: <TrendingDown className="size-3.5" />,
        label: 'HIGH DRIFT',
      };
    case 'medium':
      return {
        bar: 'bg-amber-500',
        bg: 'bg-amber-500/10',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-500/30',
        icon: <TrendingDown className="size-3.5" />,
        label: 'MEDIUM',
      };
    case 'low':
      return {
        bar: 'bg-blue-500',
        bg: 'bg-blue-500/10',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-500/30',
        icon: <Equal className="size-3.5" />,
        label: 'LOW',
      };
    case 'aligned':
      return {
        bar: 'bg-emerald-500',
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-500/30',
        icon: <TrendingUp className="size-3.5" />,
        label: 'ALIGNED',
      };
  }
}

/* ======================================================================
   Self-assessment renderer (tries to format known keys nicely)
   ====================================================================== */

const PRETTY_LABELS: Record<string, string> = {
  overallMastery: 'Self-rated overall V5 mastery',
  frameworkAddonScore: 'Framework add-on / extension fluency',
  clientHandoffConfidence: 'Client handoff confidence',
  frameworkCommandsMastered: 'Commands they marked mastered',
  soloCapableProjectTypes: 'Project types they can ship solo',
  weakSpots: 'Weak spots (not yet for solo)',
  tenMilestoneTime: '10-milestone V5 project time',
  clientCommsAlone: 'Client comms 0 → handoff alone',
  gapClosureAlone: 'Closes /qualia-verify gaps alone',
  shippedSoloCount: 'Shipped a phase to prod solo',
  debugComfort: 'Production-debug default move',
  lastSoloProject: 'Last solo project',
  wishedCommand: 'Command they wish existed',
  unclearOrBroken: 'What feels broken or unclear',
  yesGiveMeSolo: 'Project they want solo',
  scenarioInheritProject: 'Scenario · inherit project mid-build',
  scenarioWhitePageMobile: 'Scenario · white page on mobile',
  scenarioCodeYouProud: 'Scenario · code you are proud of',
  scenarioClientAIBrief: 'Scenario · client AI brief, first 3 questions',
  scenarioStuckTwoHours: 'Scenario · stuck 2 hours, next move',
  scenarioSlowPage: 'Scenario · 8s page load, where to look',
  scenarioPRReview: 'Scenario · PR review checks',
  scenarioVagueRequest: 'Scenario · "make it pop", what to ask',
  scenarioRiskyMigration: 'Scenario · NOT NULL on 10M-row table',
  scenarioFirstCommit: 'Scenario · day 1, first commit',
};

function formatValue(v: unknown): string {
  if (v == null || v === '') return '—';
  if (Array.isArray(v)) return v.length === 0 ? '—' : v.join(', ');
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

/* ======================================================================
   Main view
   ====================================================================== */

export function AuditDeepView({
  audit,
  profileId,
}: {
  audit: EmployeeAuditPayload;
  profileId: string;
}) {
  const [report, setReport] = useState<AuditDriftReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const responses = audit.latestAssessment?.responses ?? null;
  const reportRate =
    audit.sessions.totalSessions > 0
      ? Math.round((audit.reports.total / audit.sessions.totalSessions) * 100)
      : 0;

  const attendanceTone =
    audit.attendance.attendancePct >= 80
      ? 'good'
      : audit.attendance.attendancePct >= 60
        ? 'warn'
        : 'bad';
  const reportRateTone = reportRate >= 70 ? 'good' : reportRate >= 50 ? 'warn' : 'bad';
  const onTimeTone =
    audit.tasks.onTimePct >= 75 ? 'good' : audit.tasks.onTimePct >= 50 ? 'warn' : 'bad';

  const runDrift = () => {
    setError(null);
    start(async () => {
      const res = await analyzeAuditDrift(profileId);
      if (res.success) {
        setReport(res.report);
        toast.success(`Drift analysis complete — honesty score ${res.report.honestyScore}/10`);
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-10">
      {/* ============= Quick metrics grid ============= */}
      <section>
        <SectionHeader kicker="Overview" title="Last 90 days · key signals" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <StatTile
            label="Attendance"
            value={`${audit.attendance.attendancePct}%`}
            hint={`${audit.attendance.attendedWeekdays}/${audit.attendance.expectedWeekdays} expected days`}
            tone={attendanceTone}
          />
          <StatTile
            label="Sessions"
            value={String(audit.sessions.totalSessions)}
            hint={`${audit.sessions.totalHours.toFixed(1)} h total`}
          />
          <StatTile
            label="Reports filed"
            value={String(audit.reports.total)}
            hint={`${reportRate}% of sessions`}
            tone={reportRateTone}
          />
          <StatTile
            label="Verif passed"
            value={String(audit.reports.verifPassed)}
            hint={`${audit.reports.verifFailed} failed · ${audit.reports.totalGapCycles} gap cycles`}
          />
          <StatTile label="Projects worked" value={String(audit.projects.length)} />
          <StatTile
            label="Work completed"
            value={`${audit.tasks.completed}/${audit.tasks.totalAssigned}`}
            hint={`${audit.tasks.onTimePct}% on time`}
            tone={onTimeTone}
          />
          <StatTile
            label="Late after 10am"
            value={String(audit.attendance.lateAfter10)}
            hint={`${audit.attendance.veryLateAfterNoon} after noon`}
          />
          <StatTile
            label="Avg session"
            value={audit.sessions.avgSessionMin ? `${audit.sessions.avgSessionMin} min` : '—'}
            hint={`${audit.sessions.unended} unended`}
          />
        </div>
      </section>

      {/* ============= Projects worked ============= */}
      {audit.projects.length > 0 ? (
        <section>
          <SectionHeader kicker="Projects" title="Top projects by hours logged" />
          <ul className="overflow-hidden rounded-xl border border-border bg-card/40">
            {audit.projects.slice(0, 10).map((p, i) => (
              <li
                key={p.projectId}
                className={cn(
                  'flex items-baseline justify-between gap-3 px-4 py-3 text-[13px]',
                  i > 0 && 'border-t border-border'
                )}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-foreground">{p.projectName}</span>
                  {p.clientName ? (
                    <span className="ml-2 text-muted-foreground">· {p.clientName}</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums text-muted-foreground">
                  <span>{p.hoursLogged.toFixed(1)}h</span>
                  <span>
                    {p.tasksDoneOnProject}/{p.tasksOnProject} progress
                  </span>
                  <span className="rounded border border-border px-1.5 py-0.5 uppercase tracking-wider">
                    {p.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ============= Self-assessment answers ============= */}
      <section>
        <SectionHeader
          kicker="Self-assessment"
          title={
            audit.latestAssessment
              ? `Submitted ${new Date(audit.latestAssessment.submittedAt).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' })}`
              : 'Not submitted yet'
          }
        />
        {responses ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card/40">
            {Object.entries(PRETTY_LABELS)
              .filter(([key]) => responses[key] != null && responses[key] !== '')
              .map(([key, label], i) => {
                const v = responses[key];
                const isLong = typeof v === 'string' && v.length > 60;
                return (
                  <div
                    key={key}
                    className={cn(
                      'grid grid-cols-1 gap-1 px-4 py-3 md:grid-cols-[260px_1fr] md:gap-4',
                      i > 0 && 'border-t border-border'
                    )}
                  >
                    <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground md:py-1">
                      {label}
                    </span>
                    <span
                      className={cn(
                        'text-[13px] leading-relaxed text-foreground',
                        isLong && 'whitespace-pre-wrap'
                      )}
                    >
                      {formatValue(v)}
                    </span>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-[13px] text-muted-foreground">
            No assessment submitted yet. Send them the form link to start.
          </div>
        )}
      </section>

      {/* ============= Drift analysis ============= */}
      <section>
        <SectionHeader kicker="AI drift analysis" title="Claims vs. data" />

        {!report && !isPending ? (
          <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-6">
            <p className="max-w-prose text-[13px] leading-relaxed text-muted-foreground">
              Compare what they said in the self-assessment against the actual metrics above.
              Surfaces overclaims, underclaims, and internal contradictions in 3-7 findings. Uses
              Claude Sonnet via OpenRouter (~$0.02 per run, ~3-5s).
            </p>
            <Button
              type="button"
              size="default"
              disabled={!responses}
              onClick={runDrift}
              className="gap-2"
            >
              <ScanSearch className="size-4" />
              {responses ? 'Run drift analysis' : 'Waiting for self-assessment'}
            </Button>
            {error ? <p className="text-[12px] text-red-600 dark:text-red-400">{error}</p> : null}
          </div>
        ) : isPending ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card/40 p-6 text-[13px] text-muted-foreground">
            <Sparkles className="size-5 animate-pulse text-primary" />
            <div className="flex flex-col">
              <span>Analyzing drift…</span>
              <span className="font-mono text-[11px] text-muted-foreground/70">
                Comparing 25 self-assessment responses against 90 days of metrics
              </span>
            </div>
          </div>
        ) : report ? (
          <DriftReportPanel report={report} onRerun={runDrift} />
        ) : null}
      </section>
    </div>
  );
}

/* ======================================================================
   Drift report panel
   ====================================================================== */

function DriftReportPanel({ report, onRerun }: { report: AuditDriftReport; onRerun: () => void }) {
  const honestyTone = report.honestyScore >= 8 ? 'good' : report.honestyScore >= 5 ? 'warn' : 'bad';
  const honestyText = {
    good: 'text-emerald-700 dark:text-emerald-400',
    warn: 'text-amber-700 dark:text-amber-400',
    bad: 'text-red-700 dark:text-red-400',
  }[honestyTone];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Honesty score
            </span>
            <span className={cn('font-mono text-[2rem] font-semibold tabular-nums', honestyText)}>
              {report.honestyScore}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">/ 10</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onRerun}
            className="gap-1.5 text-[11px]"
          >
            <Sparkles className="size-3.5" />
            Rerun
          </Button>
        </div>
        <p className="text-[13px] leading-relaxed text-foreground">{report.summary}</p>
      </div>

      <ul className="flex flex-col gap-3">
        <AnimatePresence>
          {report.findings.map((f, i) => {
            const s = severityStyle(f.severity);
            return (
              <m.li
                key={`${f.dimension}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className={cn('overflow-hidden rounded-xl border bg-card/40', s.border)}
              >
                <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
                  <span className={cn('h-1.5 w-1.5 rounded-full', s.bar)} />
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em]',
                      s.text
                    )}
                  >
                    {s.icon}
                    {s.label}
                  </span>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    {f.dimension}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-2 md:gap-6">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      Claim
                    </span>
                    <span className="text-[13px] text-foreground">{f.claim}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      Actual
                    </span>
                    <span className="text-[13px] text-foreground">{f.actual}</span>
                  </div>
                </div>
                <div className={cn('px-4 py-3', s.bg)}>
                  <p className="text-[13px] leading-relaxed text-foreground">{f.explanation}</p>
                </div>
              </m.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        Generated{' '}
        {new Date(report.generatedAt).toLocaleString('en-IE', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
        {' · '}AI assistance — verify before acting
      </p>
    </div>
  );
}
