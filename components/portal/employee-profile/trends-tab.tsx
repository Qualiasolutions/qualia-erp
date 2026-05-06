'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Sparkline } from '@/components/ui/sparkline';
import { getEmployeeTrends, type EmployeeTrendsPayload } from '@/app/actions/admin-control';

function MiniBarChart({ data, height = 60 }: { data: number[]; height?: number }) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((v, i) => (
        <span
          key={i}
          className="ease-out-quart flex-1 rounded-sm bg-primary/30 transition-[height] duration-500 hover:bg-primary/50"
          title={`${v}`}
          style={{ height: `${(v / max) * 100}%`, minHeight: 2 }}
        />
      ))}
    </div>
  );
}

export function TrendsTab({ profileId }: { profileId: string }) {
  const [data, setData] = useState<EmployeeTrendsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getEmployeeTrends(profileId).then((result) => {
      if (cancelled) return;
      setData(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        <span className="text-sm">Computing trends…</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Could not load trends.
      </div>
    );
  }

  const velocityValues = data.velocityWeekly.map((p) => p.value);
  const hoursValues = data.hoursWeekly.map((p) => p.value);
  const completionValues = data.completionRateWeekly.map((p) => p.value);

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {/* Row 1: velocity */}
      <Card title="Tasks completed per week" subtitle="Last 8 weeks">
        <MiniBarChart data={velocityValues} />
        <Footer
          left={`${velocityValues[velocityValues.length - 1] ?? 0} this week`}
          right={`avg ${avg(velocityValues).toFixed(1)}/wk`}
        />
      </Card>
      <Card title="Avg days to close" subtitle="Last 8 weeks">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-3xl font-semibold tabular-nums">
            {data.averageDaysToClose != null ? data.averageDaysToClose.toFixed(1) : '—'}
          </span>
          <span className="text-sm text-muted-foreground">days</span>
        </div>
        {data.hoursPerCompletedTask != null ? (
          <Footer left={`${data.hoursPerCompletedTask}h per task`} right={null} />
        ) : null}
      </Card>

      {/* Row 2: attendance + wellbeing */}
      <Card title="Hours per week" subtitle="Last 8 weeks">
        <MiniBarChart data={hoursValues} />
        <Footer
          left={`${hoursValues[hoursValues.length - 1] ?? 0}h this week`}
          right={`avg ${avg(hoursValues).toFixed(1)}h/wk`}
        />
      </Card>
      <Card title="Mood + energy" subtitle="Last 30 check-ins">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-12 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Mood
            </span>
            <Sparkline
              data={data.moodSparkline}
              tone="brand"
              width={220}
              height={32}
              minPoints={5}
              ariaLabel="Mood trend"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-12 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Energy
            </span>
            <Sparkline
              data={data.energySparkline}
              tone="positive"
              width={220}
              height={32}
              minPoints={5}
              ariaLabel="Energy trend"
            />
          </div>
        </div>
      </Card>

      {/* Row 3: quality */}
      <Card title="Completion rate" subtitle="Last 8 weeks">
        <Sparkline data={completionValues} tone="brand" width={400} height={64} fillArea />
        <Footer
          left={`${completionValues[completionValues.length - 1] ?? 0}% this week`}
          right={`avg ${Math.round(avg(completionValues))}%`}
        />
      </Card>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <header>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {subtitle ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function Footer({ left, right }: { left: string; right: string | null }) {
  return (
    <div className="flex items-center justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
      <span>{left}</span>
      {right ? <span>{right}</span> : null}
    </div>
  );
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
