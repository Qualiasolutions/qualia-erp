'use client';

import { useMemo } from 'react';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  subDays,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import {
  Flame,
  Hash,
  Clock,
  BarChart3,
  TrendingUp,
  Target,
  Search,
  Sparkles,
  Mic,
  Handshake,
  BookOpen,
  FileText,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type ResearchFinding } from '@/app/actions/research';
import {
  type ResearchCategory,
  RESEARCH_CATEGORIES,
  CATEGORY_LABELS,
} from '@/lib/research-constants';

// Category icons and colors
const CATEGORY_CONFIG: Record<
  ResearchCategory,
  { icon: React.ElementType; color: string; bg: string }
> = {
  lead_generation: {
    icon: Target,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
  },
  competitor_analysis: {
    icon: Search,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-500/10',
  },
  ai_tools: { icon: Sparkles, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10' },
  voice_ai_trends: { icon: Mic, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/10' },
  partnerships: { icon: Handshake, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10' },
  industry_deep_dive: {
    icon: BookOpen,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  seo_content: {
    icon: FileText,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-500/10',
  },
  pricing_strategies: {
    icon: DollarSign,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-500/10',
  },
};

interface AnalyticsPageProps {
  findings: ResearchFinding[];
}

export function ResearchAnalytics({ findings }: AnalyticsPageProps) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Calculate analytics
  const analytics = useMemo(() => {
    // 1. Basic stats
    const totalEntries = findings.length;

    // 2. Streak calculation (weekdays only)
    let streak = 0;
    let checkDate = new Date(today);
    while (true) {
      const dayOfWeek = checkDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Skip weekends
        const hasEntry = findings.some(
          (f) =>
            f.research_date && new Date(f.research_date).toDateString() === checkDate.toDateString()
        );
        if (hasEntry) {
          streak++;
          checkDate = subDays(checkDate, 1);
        } else {
          break;
        }
      } else {
        checkDate = subDays(checkDate, 1);
      }
      // Safety limit
      if (streak > 365) break;
    }

    // 3. Category breakdown
    const categoryBreakdown = RESEARCH_CATEGORIES.map((cat) => {
      const catFindings = findings.filter((f) => f.topic_category === cat);
      const totalTime = catFindings.reduce((sum, f) => sum + (f.time_spent_minutes || 0), 0);
      const avgTime = catFindings.length > 0 ? totalTime / catFindings.length : 0;
      return {
        category: cat,
        count: catFindings.length,
        percentage: totalEntries > 0 ? (catFindings.length / totalEntries) * 100 : 0,
        totalTime,
        avgTime: Math.round(avgTime),
      };
    }).sort((a, b) => b.count - a.count);

    // 4. Time tracking
    const totalTime = findings.reduce((sum, f) => sum + (f.time_spent_minutes || 0), 0);
    const avgTimePerEntry = totalEntries > 0 ? Math.round(totalTime / totalEntries) : 0;

    // 5. Weekly trend (last 8 weeks)
    const weeklyTrend: Array<{
      week: string;
      count: number;
      categories: Partial<Record<ResearchCategory, number>>;
    }> = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(today, i * 7), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekLabel = format(weekStart, 'MMM d');

      const weekFindings = findings.filter((f) => {
        if (!f.research_date) return false;
        const date = new Date(f.research_date);
        return date >= weekStart && date <= weekEnd;
      });

      const categories: Partial<Record<ResearchCategory, number>> = {};
      weekFindings.forEach((f) => {
        const cat = f.topic_category as ResearchCategory;
        categories[cat] = (categories[cat] || 0) + 1;
      });

      weeklyTrend.push({ week: weekLabel, count: weekFindings.length, categories });
    }

    // 6. This month stats
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const thisMonthFindings = findings.filter((f) => {
      if (!f.research_date) return false;
      const date = new Date(f.research_date);
      return date >= monthStart && date <= monthEnd;
    });

    // 7. Tool usage
    const geminiUsed = findings.filter((f) => f.gemini_used).length;
    const notebooklmUsed = findings.filter((f) => f.notebooklm_used).length;
    const bothUsed = findings.filter((f) => f.gemini_used && f.notebooklm_used).length;

    // 8. Activity calendar (last 30 days)
    const activityCalendar: Array<{ date: string; hasEntry: boolean; count: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = date.toDateString();
      const dayFindings = findings.filter(
        (f) => f.research_date && new Date(f.research_date).toDateString() === dateStr
      );
      activityCalendar.push({
        date: format(date, 'MMM d'),
        hasEntry: dayFindings.length > 0,
        count: dayFindings.length,
      });
    }

    return {
      totalEntries,
      streak,
      categoryBreakdown,
      totalTime,
      avgTimePerEntry,
      weeklyTrend,
      thisMonthCount: thisMonthFindings.length,
      geminiUsed,
      notebooklmUsed,
      bothUsed,
      activityCalendar,
    };
  }, [findings, today]);

  const maxWeeklyCount = Math.max(...analytics.weeklyTrend.map((w) => w.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Research Analytics</h2>
        <p className="text-sm text-muted-foreground">Track your research progress and insights</p>
      </div>

      {/* Key Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <StatCard
          icon={BarChart3}
          label="Total Entries"
          value={analytics.totalEntries}
          color="text-qualia-500"
        />
        <StatCard
          icon={Flame}
          label="Current Streak"
          value={analytics.streak}
          suffix="days"
          color="text-amber-500"
        />
        <StatCard
          icon={Clock}
          label="Total Time"
          value={Math.round(analytics.totalTime / 60)}
          suffix="hrs"
          color="text-blue-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg/Entry"
          value={analytics.avgTimePerEntry}
          suffix="min"
          color="text-emerald-500"
        />
        <StatCard
          icon={Calendar}
          label="This Month"
          value={analytics.thisMonthCount}
          color="text-violet-500"
        />
        <StatCard
          icon={Sparkles}
          label="Gemini"
          value={analytics.geminiUsed}
          color="text-purple-500"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Hash className="h-4 w-4" />
              Category Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.categoryBreakdown.map((cat) => {
              const Config = CATEGORY_CONFIG[cat.category];
              const Icon = Config.icon;
              return (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-md',
                          Config.bg
                        )}
                      >
                        <Icon className={cn('h-3.5 w-3.5', Config.color)} />
                      </div>
                      <span className="font-medium text-foreground">
                        {CATEGORY_LABELS[cat.category]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{cat.count} entries</span>
                      <span className={cn('text-xs font-medium', Config.color)}>
                        {cat.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full', Config.color.replace('text', 'bg'))}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                  {cat.totalTime > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {Math.round(cat.totalTime / 60)}h total · {cat.avgTime}min avg
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Weekly Trend (8 weeks)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end justify-between gap-1 pt-2">
              {analytics.weeklyTrend.map((week, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative flex h-28 w-full items-end justify-center gap-0.5">
                    {RESEARCH_CATEGORIES.map((cat) => {
                      const count = week.categories[cat] || 0;
                      if (count === 0) return null;
                      const Config = CATEGORY_CONFIG[cat];
                      const height = (count / maxWeeklyCount) * 100;
                      return (
                        <div
                          key={cat}
                          className={cn('min-w-[4px] flex-1 rounded-t-sm', Config.bg)}
                          style={{ height: `${height}%` }}
                          title={`${CATEGORY_LABELS[cat]}: ${count}`}
                        />
                      );
                    })}
                  </div>
                  <div className="rotate-0 text-[10px] text-muted-foreground sm:origin-top-left sm:-rotate-45">
                    {week.week}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              {RESEARCH_CATEGORIES.map((cat) => {
                const Config = CATEGORY_CONFIG[cat];
                const Icon = Config.icon;
                return (
                  <div key={cat} className="flex items-center gap-1 text-xs">
                    <div
                      className={cn('h-2 w-2 rounded-full', Config.color.replace('text', 'bg'))}
                    />
                    <Icon className={cn('h-3 w-3', Config.color)} />
                    <span className="text-muted-foreground">{CATEGORY_LABELS[cat]}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Last 30 Days Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap justify-center gap-1">
            {analytics.activityCalendar.map((day, i) => {
              const intensity =
                day.count > 3 ? 'high' : day.count > 1 ? 'medium' : day.count > 0 ? 'low' : 'none';
              return (
                <div
                  key={i}
                  className={cn(
                    'flex h-8 w-8 flex-col items-center justify-center rounded-md text-[10px] transition-colors sm:h-10 sm:w-10 sm:text-xs',
                    intensity === 'high' && 'bg-qualia-500 text-white',
                    intensity === 'medium' && 'bg-qualia-500/60 text-foreground',
                    intensity === 'low' && 'bg-qualia-500/30 text-foreground',
                    intensity === 'none' && 'bg-muted/30 text-muted-foreground'
                  )}
                  title={`${day.date}: ${day.count} entries`}
                >
                  <span className="scale-90">
                    {format(parseISO(day.date.replace(/ /g, '-').concat('-2024')), 'd')}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="h-4 w-4 rounded bg-muted/30" />
              <div className="h-4 w-4 rounded bg-qualia-500/30" />
              <div className="h-4 w-4 rounded bg-qualia-500/60" />
              <div className="h-4 w-4 rounded bg-qualia-500" />
            </div>
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      {/* Tool Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            Research Tools Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-4 text-center">
              <Sparkles className="mx-auto mb-2 h-6 w-6 text-purple-500" />
              <p className="text-2xl font-semibold text-foreground">{analytics.geminiUsed}</p>
              <p className="text-xs text-muted-foreground">Gemini Deep Research</p>
            </div>
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4 text-center">
              <BookOpen className="mx-auto mb-2 h-6 w-6 text-blue-500" />
              <p className="text-2xl font-semibold text-foreground">{analytics.notebooklmUsed}</p>
              <p className="text-xs text-muted-foreground">NotebookLM</p>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
              <div className="mx-auto mb-2 flex h-6 w-6 items-center justify-center">
                <Sparkles className="h-3 w-3 text-purple-500" />
                <BookOpen className="-ml-1 h-3 w-3 text-blue-500" />
              </div>
              <p className="text-2xl font-semibold text-foreground">{analytics.bothUsed}</p>
              <p className="text-xs text-muted-foreground">Both Tools</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  suffix?: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card p-3">
      <div className="mb-1 flex items-center gap-2 text-muted-foreground">
        <Icon className={cn('h-3.5 w-3.5', color)} />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">
        {value}
        {suffix && <span className="ml-1 text-sm font-normal text-muted-foreground">{suffix}</span>}
      </p>
    </div>
  );
}
