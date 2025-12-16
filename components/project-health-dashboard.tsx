'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Zap,
  MessageSquare,
  Target,
  ChevronRight,
  RefreshCw,
  Sparkles,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  getWorkspaceHealthDashboard,
  recordAllProjectsHealth,
  type ProjectHealthData,
} from '@/app/actions/health';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

// Health score thresholds and colors
const getHealthColor = (score: number | null | undefined) => {
  if (!score && score !== 0) return 'text-muted-foreground';
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-sky-500';
  if (score >= 40) return 'text-amber-500';
  return 'text-red-500';
};

const getHealthBgColor = (score: number | null | undefined) => {
  if (!score && score !== 0) return 'bg-muted/50';
  if (score >= 80) return 'bg-emerald-500/10';
  if (score >= 60) return 'bg-sky-500/10';
  if (score >= 40) return 'bg-amber-500/10';
  return 'bg-red-500/10';
};

const getHealthLabel = (score: number | null | undefined) => {
  if (!score && score !== 0) return 'No Data';
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs Attention';
  return 'Critical';
};

const getTrendIcon = (trend: string | null | undefined) => {
  switch (trend) {
    case 'improving':
      return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    case 'declining':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
};

// Component Icons
const getComponentIcon = (component: string) => {
  switch (component) {
    case 'schedule':
      return Clock;
    case 'velocity':
      return Zap;
    case 'quality':
      return Target;
    case 'communication':
      return MessageSquare;
    default:
      return Activity;
  }
};

interface ProjectHealthDashboardProps {
  workspaceId?: string;
}

export function ProjectHealthDashboard({ workspaceId }: ProjectHealthDashboardProps) {
  const [projects, setProjects] = useState<ProjectHealthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  useEffect(() => {
    loadDashboard();
  }, [workspaceId]);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const result = await getWorkspaceHealthDashboard(workspaceId);
      if (result.success && result.data) {
        setProjects(result.data as ProjectHealthData[]);
        setLastRefreshed(new Date());
      } else {
        setError(result.error || 'Failed to load dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      // Record new health metrics for all projects
      await recordAllProjectsHealth(workspaceId);
      // Reload dashboard
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  }

  // Calculate workspace-wide statistics
  const workspaceStats = {
    totalProjects: projects.length,
    averageHealth:
      projects.length > 0
        ? Math.round(
            projects.reduce((sum, p) => sum + (p.overall_health_score || 0), 0) / projects.length
          )
        : 0,
    criticalProjects: projects.filter((p) => (p.overall_health_score || 0) < 40).length,
    excellentProjects: projects.filter((p) => (p.overall_health_score || 0) >= 80).length,
    totalInsights: projects.reduce((sum, p) => sum + p.active_insights_count, 0),
    criticalInsights: projects.reduce((sum, p) => sum + p.critical_insights_count, 0),
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted/50" />
              <CardContent className="h-20 bg-muted/30" />
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted/30" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-8 w-8 text-red-500" />
          <p className="text-sm text-red-500">{error}</p>
          <Button onClick={loadDashboard} variant="outline" size="sm" className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Project Health Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Real-time health monitoring for all active projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefreshed && (
            <span className="text-xs text-muted-foreground">
              Updated {formatDistanceToNow(lastRefreshed, { addSuffix: true })}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Workspace Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workspaceStats.totalProjects}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn('text-2xl font-bold', getHealthColor(workspaceStats.averageHealth))}
            >
              {workspaceStats.averageHealth}%
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Excellent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {workspaceStats.excellentProjects}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                {workspaceStats.criticalProjects}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workspaceStats.totalInsights}</div>
          </CardContent>
        </Card>

        <Card className={cn(workspaceStats.criticalInsights > 0 && 'border-orange-500/30')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critical Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                workspaceStats.criticalInsights > 0 ? 'text-orange-500' : 'text-muted-foreground'
              )}
            >
              {workspaceStats.criticalInsights}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex h-32 items-center justify-center">
              <p className="text-sm text-muted-foreground">No active projects to monitor</p>
            </CardContent>
          </Card>
        ) : (
          projects.map((project) => (
            <ProjectHealthCard key={project.project_id} project={project} />
          ))
        )}
      </div>
    </div>
  );
}

// Individual Project Health Card
function ProjectHealthCard({ project }: { project: ProjectHealthData }) {
  const healthScore = project.overall_health_score || 0;
  const hasInsights = project.active_insights_count > 0;
  const hasCritical = project.critical_insights_count > 0;

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-lg',
        hasCritical && 'border-red-500/30',
        !hasCritical && hasInsights && 'border-amber-500/20'
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Link
                href={`/projects/${project.project_id}`}
                className="text-lg font-semibold hover:text-primary"
              >
                {project.project_name}
              </Link>
              {getTrendIcon(project.health_trend)}
              {hasCritical && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {project.critical_insights_count} Critical
                </Badge>
              )}
              {!hasCritical && hasInsights && (
                <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-600">
                  <AlertCircle className="h-3 w-3" />
                  {project.active_insights_count} Insights
                </Badge>
              )}
            </div>
            <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
              {project.client_name && (
                <span>Client: {project.client_name}</span>
              )}
              {project.lead_name && (
                <span>Lead: {project.lead_name}</span>
              )}
              {project.project_type && (
                <Badge variant="secondary">{project.project_type.replace('_', ' ')}</Badge>
              )}
            </div>
          </div>

          {/* Overall Health Score */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'flex h-16 w-16 items-center justify-center rounded-full',
                getHealthBgColor(healthScore)
              )}
            >
              <span className={cn('text-2xl font-bold', getHealthColor(healthScore))}>
                {healthScore}
              </span>
            </div>
            <span className="mt-1 text-xs text-muted-foreground">
              {getHealthLabel(healthScore)}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Component Scores */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { key: 'schedule', label: 'Schedule', score: project.schedule_health },
            { key: 'velocity', label: 'Velocity', score: project.velocity_health },
            { key: 'quality', label: 'Quality', score: project.quality_health },
            { key: 'communication', label: 'Communication', score: project.communication_health },
          ].map((component) => {
            const Icon = getComponentIcon(component.key);
            const score = component.score || 0;
            return (
              <div key={component.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{component.label}</span>
                  </div>
                  <span className={cn('text-sm font-bold', getHealthColor(score))}>
                    {score}%
                  </span>
                </div>
                <Progress value={score} className="h-1.5" />
              </div>
            );
          })}
        </div>

        {/* Key Metrics */}
        {project.metrics_data && (
          <div className="mt-4 flex flex-wrap gap-4 border-t pt-4 text-xs text-muted-foreground">
            {project.metrics_data.schedule?.days_until_deadline !== undefined && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {Math.round(project.metrics_data.schedule.days_until_deadline)} days left
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Days until project deadline</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {project.metrics_data.schedule?.roadmap_progress !== undefined && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      <span>
                        {Math.round(project.metrics_data.schedule.roadmap_progress)}% complete
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Roadmap completion progress</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {project.metrics_data.velocity?.items_completed_7d !== undefined && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      <span>{project.metrics_data.velocity.items_completed_7d} tasks/week</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Tasks completed in last 7 days</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {project.metrics_data.communication?.days_since_meeting !== undefined && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>
                        Last meeting{' '}
                        {Math.round(project.metrics_data.communication.days_since_meeting)} days ago
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Days since last client meeting</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

        {/* View Details Link */}
        <div className="mt-4 flex justify-end">
          <Link href={`/projects/${project.project_id}/health`}>
            <Button variant="ghost" size="sm" className="gap-2">
              View Details
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}