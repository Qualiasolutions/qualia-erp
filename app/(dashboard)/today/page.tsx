'use client';

import { useEffect, useState } from 'react';
import { Target, CheckCircle2, Flame, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DifficultyBadge } from '@/components/mentorship/difficulty-badge';
import { SkillGrowthWidget } from '@/components/skills/skill-growth-widget';
import { getTodaysFocus, getExtendedProfile } from '@/app/actions/learning';
import { cn } from '@/lib/utils';
import { ISSUE_STATUS_COLORS } from '@/lib/color-constants';
import type { Issue, ExtendedProfile, TaskDifficulty, IssueStatus } from '@/types/database';
import Link from 'next/link';

interface TodayTask extends Issue {
  project?: { name: string } | null;
  difficulty?: TaskDifficulty;
  learning_objective?: string | null;
}

export default function TodayPage() {
  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [pendingReviews, setPendingReviews] = useState<TodayTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [profileResult, focusResult] = await Promise.all([
        getExtendedProfile(),
        getTodaysFocus(),
      ]);

      if (profileResult.success && profileResult.data) {
        setProfile(profileResult.data);
      }

      if (focusResult.success && focusResult.data) {
        // Combine top priority with overdue and due today
        const allTasks: TodayTask[] = [];
        if (focusResult.data.topPriority) {
          allTasks.push(focusResult.data.topPriority as TodayTask);
        }
        allTasks.push(...((focusResult.data.overdue as TodayTask[]) || []));
        allTasks.push(...((focusResult.data.dueToday as TodayTask[]) || []));
        setTasks(allTasks);
        setPendingReviews((focusResult.data.pendingReviews as TodayTask[]) || []);
      }

      setLoading(false);
    }
    load();
  }, []);

  const completedTasks = tasks.filter((t) => t.status === 'Done').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading your focus...</div>
      </div>
    );
  }

  const greeting = getGreeting(profile?.full_name?.split(' ')[0] || 'there');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Target className="h-6 w-6 text-qualia-500" />
          {greeting}
        </h1>
        <p className="text-muted-foreground">
          {totalTasks === 0
            ? 'No tasks assigned yet. Check with Fawzi for your next assignment!'
            : `You have ${totalTasks - completedTasks} task${totalTasks - completedTasks !== 1 ? 's' : ''} to focus on today.`}
        </p>
      </div>

      {/* Progress Overview */}
      {totalTasks > 0 && (
        <Card className="border-qualia-500/30">
          <CardContent className="pt-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-qualia-500/10 p-2">
                  <CheckCircle2 className="h-5 w-5 text-qualia-400" />
                </div>
                <div>
                  <p className="font-medium">Today&apos;s Progress</p>
                  <p className="text-sm text-muted-foreground">
                    {completedTasks} of {totalTasks} completed
                  </p>
                </div>
              </div>
              {profile?.current_streak && profile.current_streak > 0 && (
                <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-400">
                  <Flame className="mr-1 h-3 w-3" />
                  {profile.current_streak} day streak
                </Badge>
              )}
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Tasks Column */}
        <div className="space-y-4 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Priority Tasks
          </h2>

          {tasks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Target className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                <p className="text-muted-foreground">No tasks for today</p>
                <p className="mt-1 text-sm text-muted-foreground/60">
                  Tasks assigned to you will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}

          {/* Pending Reviews (for mentors) */}
          {pendingReviews.length > 0 && (
            <div className="pt-4">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-medium">
                <CheckCircle2 className="h-4 w-4 text-amber-400" />
                Awaiting Your Review
              </h2>
              <div className="space-y-2">
                {pendingReviews.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <SkillGrowthWidget profileId={profile?.id} />

          {/* Quick Tips */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Quick Tip
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{getRandomTip()}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: TodayTask }) {
  const status = task.status as IssueStatus;
  const statusConfig = status ? ISSUE_STATUS_COLORS[status] : ISSUE_STATUS_COLORS['Yet to Start'];

  return (
    <Card
      className={cn(
        'group transition-colors hover:border-qualia-500/40',
        status === 'Done' && 'opacity-60'
      )}
    >
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              {task.difficulty && (
                <DifficultyBadge difficulty={task.difficulty} size="sm" showLabel={false} />
              )}
              <Link
                href={`/board?issue=${task.id}`}
                className="truncate text-sm font-medium transition-colors hover:text-qualia-400"
              >
                {task.title}
              </Link>
            </div>

            {task.project && (
              <p className="mb-2 text-xs text-muted-foreground">in {task.project.name}</p>
            )}

            {task.learning_objective && (
              <div className="inline-block rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-400/80">
                Learning: {task.learning_objective}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge className={cn(statusConfig.bg, statusConfig.text)}>{status || 'Unknown'}</Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
              asChild
            >
              <Link href={`/board?issue=${task.id}`}>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

function getRandomTip(): string {
  const tips = [
    'Start with the easiest task to build momentum for the day.',
    'Take short breaks between tasks to stay fresh and focused.',
    "If you're stuck, ask Fawzi for a hint using the teaching notes feature.",
    'Complete tasks thoroughly before moving on - quality over quantity!',
    'Use the voice assistant to quickly check your schedule or create tasks.',
    "Review completed tasks to reinforce what you've learned.",
    "Don't hesitate to submit tasks for review - feedback helps you grow!",
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}
