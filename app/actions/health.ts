'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from './index';
import type { ActionResult } from './shared';

export interface HealthMetrics {
  overall_health_score: number;
  schedule_health: number;
  velocity_health: number;
  quality_health: number;
  communication_health: number;
  metrics_data: {
    schedule?: {
      days_until_deadline?: number;
      roadmap_progress?: number;
    };
    velocity?: {
      items_completed_7d?: number;
    };
    quality?: {
      stale_phases?: number;
    };
    communication?: {
      days_since_meeting?: number;
    };
  };
}

export interface ProjectHealthData {
  project_id: string;
  project_name: string;
  project_status: string;
  project_type: string | null;
  overall_health_score: number | null;
  schedule_health: number | null;
  velocity_health: number | null;
  quality_health: number | null;
  communication_health: number | null;
  metrics_data: HealthMetrics['metrics_data'] | null;
  last_measured_at: string | null;
  lead_name: string | null;
  client_name: string | null;
  active_insights_count: number;
  critical_insights_count: number;
  health_trend: 'improving' | 'declining' | 'stable' | null;
}

export interface HealthInsight {
  id: string;
  project_id: string;
  insight_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  recommendations: Array<{
    action: string;
    priority: string;
    estimated_impact: string;
  }>;
  status: string;
  created_at: string;
}

// Get current health for all projects in workspace
export async function getWorkspaceHealthDashboard(workspaceId?: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const wsId = workspaceId || (await getCurrentWorkspaceId());
    if (!wsId) {
      return { success: false, error: 'No workspace selected' };
    }

    // First, refresh the materialized view
    await supabase.rpc('refresh_project_health_view');

    // Query materialized view for fast results
    const { data: projects, error } = await supabase
      .from('project_health_current')
      .select('*')
      .eq('workspace_id', wsId)
      .order('overall_health_score', { ascending: true, nullsFirst: false }); // Worst first

    if (error) throw error;

    return { success: true, data: projects as ProjectHealthData[] };
  } catch (error) {
    console.error('Error fetching workspace health:', error);
    return { success: false, error: 'Failed to load health dashboard' };
  }
}

// Get detailed health for a specific project
export async function getProjectHealthDetails(projectId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Run all 3 queries in parallel
    const [healthResult, insightsResult, historyResult] = await Promise.all([
      supabase.rpc('calculate_project_health', { p_project_id: projectId }),
      supabase
        .from('project_health_insights')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'active')
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('project_health_metrics')
        .select(
          'measured_at, overall_health_score, schedule_health, velocity_health, quality_health, communication_health'
        )
        .eq('project_id', projectId)
        .gte('measured_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('measured_at', { ascending: true }),
    ]);

    if (healthResult.error) throw healthResult.error;
    if (insightsResult.error) throw insightsResult.error;
    if (historyResult.error) throw historyResult.error;

    return {
      success: true,
      data: {
        current: healthResult.data as HealthMetrics,
        insights: insightsResult.data as HealthInsight[],
        history: historyResult.data,
      },
    };
  } catch (error) {
    console.error('Error fetching project health details:', error);
    return { success: false, error: 'Failed to load project health' };
  }
}

// Record new health snapshot
export async function recordProjectHealth(projectId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get project workspace
    const { data: project } = await supabase
      .from('projects')
      .select('workspace_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    // Calculate health
    const { data: health, error: calcError } = await supabase.rpc('calculate_project_health', {
      p_project_id: projectId,
    });

    if (calcError) throw calcError;

    // Insert health record
    const { error: insertError } = await supabase.from('project_health_metrics').insert({
      project_id: projectId,
      workspace_id: project.workspace_id,
      overall_health_score: health.overall_health_score,
      schedule_health: health.schedule_health,
      velocity_health: health.velocity_health,
      quality_health: health.quality_health,
      communication_health: health.communication_health,
      metrics_data: health.metrics_data,
      created_by: user.id,
    });

    if (insertError) throw insertError;

    // Generate insights
    await supabase.rpc('generate_project_insights', { p_project_id: projectId });

    return { success: true };
  } catch (error) {
    console.error('Error recording project health:', error);
    return { success: false, error: 'Failed to record health metrics' };
  }
}

// Record health for all projects in workspace
export async function recordAllProjectsHealth(workspaceId?: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const wsId = workspaceId || (await getCurrentWorkspaceId());
    if (!wsId) {
      return { success: false, error: 'No workspace selected' };
    }

    // Get all active projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('workspace_id', wsId)
      .not('status', 'in', '("archived","canceled")');

    if (projectsError) throw projectsError;

    // Record health for each project in parallel for better performance
    const results = await Promise.all(
      (projects || []).map((project) =>
        recordProjectHealth(project.id)
          .then((result) => ({ project_id: project.id, success: result.success }))
          .catch(() => ({ project_id: project.id, success: false }))
      )
    );

    // Refresh materialized view
    await supabase.rpc('refresh_project_health_view');

    return {
      success: true,
      data: {
        total: projects?.length || 0,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    };
  } catch (error) {
    console.error('Error recording all projects health:', error);
    return { success: false, error: 'Failed to record health metrics' };
  }
}

// Acknowledge an insight
export async function acknowledgeInsight(insightId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('project_health_insights')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user.id,
      })
      .eq('id', insightId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error acknowledging insight:', error);
    return { success: false, error: 'Failed to acknowledge insight' };
  }
}

// Resolve an insight
export async function resolveInsight(insightId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('project_health_insights')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq('id', insightId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error resolving insight:', error);
    return { success: false, error: 'Failed to resolve insight' };
  }
}

// Dismiss an insight
export async function dismissInsight(insightId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('project_health_insights')
      .update({
        status: 'dismissed',
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq('id', insightId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error dismissing insight:', error);
    return { success: false, error: 'Failed to dismiss insight' };
  }
}

// Simple health summary for a project (used by SWR hook)
export interface ProjectHealthSummary {
  overall_score: number;
  schedule: number;
  velocity: number;
  quality: number;
  communication: number;
  trend: 'improving' | 'declining' | 'stable';
  active_insights: number;
  critical_insights: number;
  last_updated: string | null;
}

export async function getProjectHealth(projectId: string): Promise<ProjectHealthSummary | null> {
  try {
    const supabase = await createClient();

    // Run all 3 queries in parallel
    const [metricsResult, activeInsightsResult, criticalInsightsResult] = await Promise.all([
      supabase
        .from('project_health_metrics')
        .select('*')
        .eq('project_id', projectId)
        .order('measured_at', { ascending: false })
        .limit(2),
      supabase
        .from('project_health_insights')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('status', 'active'),
      supabase
        .from('project_health_insights')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('status', 'active')
        .eq('severity', 'critical'),
    ]);

    const { data: metrics, error: metricsError } = metricsResult;
    const { count: activeInsights, error: insightsError } = activeInsightsResult;
    const { count: criticalInsights } = criticalInsightsResult;

    if (metricsError) {
      console.error('[getProjectHealth] Metrics error:', metricsError);
      return null;
    }

    if (insightsError) {
      console.error('[getProjectHealth] Insights error:', insightsError);
    }

    if (!metrics || metrics.length === 0) {
      // No health data yet, return defaults
      return {
        overall_score: 0,
        schedule: 0,
        velocity: 0,
        quality: 0,
        communication: 0,
        trend: 'stable',
        active_insights: activeInsights || 0,
        critical_insights: criticalInsights || 0,
        last_updated: null,
      };
    }

    const latest = metrics[0];
    const previous = metrics[1];

    // Determine trend
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (previous) {
      const diff = (latest.overall_health_score || 0) - (previous.overall_health_score || 0);
      if (diff > 5) trend = 'improving';
      else if (diff < -5) trend = 'declining';
    }

    return {
      overall_score: latest.overall_health_score || 0,
      schedule: latest.schedule_health || 0,
      velocity: latest.velocity_health || 0,
      quality: latest.quality_health || 0,
      communication: latest.communication_health || 0,
      trend,
      active_insights: activeInsights || 0,
      critical_insights: criticalInsights || 0,
      last_updated: latest.measured_at,
    };
  } catch (error) {
    console.error('[getProjectHealth] Error:', error);
    return null;
  }
}
