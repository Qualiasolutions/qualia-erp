-- =====================================================
-- MIGRATION: Add Project Health Dashboard System
-- Description: Comprehensive health tracking for projects
-- Author: Qualia Solutions
-- Date: 2025-12-15
-- =====================================================

-- Core metrics tracking table (time-series data)
CREATE TABLE IF NOT EXISTS public.project_health_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,

  -- Timestamp
  measured_at timestamptz DEFAULT now() NOT NULL,

  -- Core Health Score (0-100)
  overall_health_score integer NOT NULL CHECK (overall_health_score >= 0 AND overall_health_score <= 100),

  -- Component Scores (0-100)
  schedule_health integer NOT NULL CHECK (schedule_health >= 0 AND schedule_health <= 100),
  velocity_health integer NOT NULL CHECK (velocity_health >= 0 AND velocity_health <= 100),
  quality_health integer NOT NULL CHECK (quality_health >= 0 AND quality_health <= 100),
  communication_health integer NOT NULL CHECK (communication_health >= 0 AND communication_health <= 100),

  -- Raw Metrics
  metrics_data jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes for time-series queries
CREATE INDEX IF NOT EXISTS idx_health_metrics_project_time ON project_health_metrics(project_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_metrics_workspace ON project_health_metrics(workspace_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_measured_at ON project_health_metrics(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_metrics_overall_score ON project_health_metrics(overall_health_score);

-- Partial index for recent metrics (last 90 days)
CREATE INDEX IF NOT EXISTS idx_health_metrics_recent ON project_health_metrics(project_id, measured_at DESC)
WHERE measured_at > now() - interval '90 days';

-- Smart insights and automated alerts
CREATE TABLE IF NOT EXISTS public.project_health_insights (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,

  -- Insight details
  insight_type text NOT NULL CHECK (insight_type IN (
    'deadline_risk',
    'velocity_drop',
    'quality_issue',
    'communication_gap',
    'milestone_at_risk',
    'team_capacity',
    'blocked_tasks',
    'scope_creep'
  )),

  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),

  title text NOT NULL,
  description text NOT NULL,

  -- Actionable recommendations
  recommendations jsonb DEFAULT '[]'::jsonb,

  -- Metrics that triggered this insight
  triggered_by jsonb,

  -- Status tracking
  status text DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_insights_project ON project_health_insights(project_id);
CREATE INDEX IF NOT EXISTS idx_health_insights_status ON project_health_insights(status);
CREATE INDEX IF NOT EXISTS idx_health_insights_severity ON project_health_insights(severity);
CREATE INDEX IF NOT EXISTS idx_health_insights_type ON project_health_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_health_insights_created ON project_health_insights(created_at DESC);

-- =====================================================
-- Helper function to calculate roadmap progress
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_roadmap_progress(p_project_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_items integer;
  v_completed_items integer;
  v_progress numeric;
BEGIN
  -- Count total and completed phase items
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE pi.is_completed = true)
  INTO v_total_items, v_completed_items
  FROM phase_items pi
  JOIN project_phases pp ON pi.phase_id = pp.id
  WHERE pp.project_id = p_project_id;

  -- Calculate percentage
  IF v_total_items > 0 THEN
    v_progress := (v_completed_items::numeric / v_total_items) * 100;
  ELSE
    v_progress := 0;
  END IF;

  RETURN ROUND(v_progress, 1);
END;
$$;

-- =====================================================
-- Calculate schedule health
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_schedule_health(p_project_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days_until_deadline numeric;
  v_roadmap_progress numeric;
  v_expected_progress numeric;
  v_schedule_variance numeric;
  v_score integer;
BEGIN
  -- Get days until deadline
  SELECT
    EXTRACT(epoch FROM (target_date - CURRENT_DATE)) / 86400
  INTO v_days_until_deadline
  FROM projects
  WHERE id = p_project_id;

  -- Get roadmap progress
  SELECT calculate_roadmap_progress(p_project_id) INTO v_roadmap_progress;

  -- Calculate expected progress based on time elapsed
  SELECT
    CASE
      WHEN start_date IS NULL OR target_date IS NULL THEN 50
      WHEN target_date <= CURRENT_DATE THEN 100
      WHEN start_date >= CURRENT_DATE THEN 0
      ELSE
        (EXTRACT(epoch FROM (CURRENT_DATE - start_date)) /
         NULLIF(EXTRACT(epoch FROM (target_date - start_date)), 0)) * 100
    END
  INTO v_expected_progress
  FROM projects
  WHERE id = p_project_id;

  -- Calculate variance
  v_schedule_variance := v_roadmap_progress - v_expected_progress;

  -- Score calculation
  v_score := CASE
    WHEN v_schedule_variance > 10 THEN 100
    WHEN v_schedule_variance >= -10 AND v_schedule_variance <= 10 THEN
      GREATEST(85, 85 + (v_schedule_variance * 1.5)::integer)
    WHEN v_schedule_variance >= -30 AND v_schedule_variance < -10 THEN
      GREATEST(50, 70 + (v_schedule_variance + 10)::integer)
    WHEN v_schedule_variance < -30 THEN
      GREATEST(0, 40 + (v_schedule_variance + 30)::integer)
    ELSE 50
  END;

  -- Deadline proximity penalty
  IF v_days_until_deadline IS NOT NULL AND v_days_until_deadline < 7
     AND v_roadmap_progress < 90 THEN
    v_score := v_score - 20;
  END IF;

  RETURN GREATEST(0, LEAST(100, v_score));
END;
$$;

-- =====================================================
-- Calculate velocity health
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_velocity_health(p_project_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed_last_7d integer;
  v_completed_prev_7d integer;
  v_total_items integer;
  v_done_items integer;
  v_velocity_trend numeric;
  v_completion_rate numeric;
  v_score integer;
BEGIN
  -- Items completed in last 7 days
  SELECT COUNT(*)
  INTO v_completed_last_7d
  FROM phase_items pi
  JOIN project_phases pp ON pi.phase_id = pp.id
  WHERE pp.project_id = p_project_id
    AND pi.is_completed = true
    AND pi.completed_at >= now() - interval '7 days';

  -- Items completed in previous 7 days
  SELECT COUNT(*)
  INTO v_completed_prev_7d
  FROM phase_items pi
  JOIN project_phases pp ON pi.phase_id = pp.id
  WHERE pp.project_id = p_project_id
    AND pi.is_completed = true
    AND pi.completed_at >= now() - interval '14 days'
    AND pi.completed_at < now() - interval '7 days';

  -- Total and done items
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE pi.is_completed = true)
  INTO v_total_items, v_done_items
  FROM phase_items pi
  JOIN project_phases pp ON pi.phase_id = pp.id
  WHERE pp.project_id = p_project_id;

  -- Calculate velocity trend
  IF v_completed_prev_7d > 0 THEN
    v_velocity_trend := (v_completed_last_7d::numeric - v_completed_prev_7d) / v_completed_prev_7d * 100;
  ELSE
    v_velocity_trend := 0;
  END IF;

  -- Calculate completion rate
  IF v_total_items > 0 THEN
    v_completion_rate := (v_done_items::numeric / v_total_items) * 100;
  ELSE
    v_completion_rate := 100;
  END IF;

  -- Base score from completion rate
  v_score := LEAST(100, v_completion_rate * 1.2)::integer;

  -- Adjust for velocity trend
  IF v_velocity_trend > 20 THEN
    v_score := LEAST(100, v_score + 10);
  ELSIF v_velocity_trend < -20 THEN
    v_score := GREATEST(0, v_score - 15);
  END IF;

  -- Penalize if no recent activity
  IF v_completed_last_7d = 0 AND v_total_items - v_done_items > 5 THEN
    v_score := GREATEST(0, v_score - 25);
  END IF;

  RETURN GREATEST(0, LEAST(100, v_score));
END;
$$;

-- =====================================================
-- Calculate quality health
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_quality_health(p_project_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stale_phases integer;
  v_incomplete_critical integer;
  v_total_open integer;
  v_score integer := 100;
BEGIN
  -- Count stale phases (in progress for > 14 days)
  SELECT COUNT(*)
  INTO v_stale_phases
  FROM project_phases
  WHERE project_id = p_project_id
    AND status = 'in_progress'
    AND updated_at < now() - interval '14 days';

  -- Count incomplete critical items
  SELECT COUNT(*)
  INTO v_incomplete_critical
  FROM phase_items pi
  JOIN project_phases pp ON pi.phase_id = pp.id
  WHERE pp.project_id = p_project_id
    AND pi.is_completed = false
    AND pp.status IN ('in_progress', 'not_started');

  -- Total open items
  SELECT COUNT(*)
  INTO v_total_open
  FROM phase_items pi
  JOIN project_phases pp ON pi.phase_id = pp.id
  WHERE pp.project_id = p_project_id
    AND pi.is_completed = false;

  -- Deduct points for quality issues
  v_score := v_score - (v_stale_phases * 15);
  v_score := v_score - (v_incomplete_critical * 3);

  -- Bonus if no open items
  IF v_total_open = 0 THEN
    v_score := 100;
  END IF;

  RETURN GREATEST(0, LEAST(100, v_score));
END;
$$;

-- =====================================================
-- Calculate communication health
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_communication_health(p_project_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days_since_meeting numeric;
  v_days_since_activity numeric;
  v_upcoming_meetings integer;
  v_client_id uuid;
  v_score integer := 100;
BEGIN
  -- Get client ID
  SELECT client_id INTO v_client_id
  FROM projects
  WHERE id = p_project_id;

  -- Days since last meeting
  SELECT
    EXTRACT(epoch FROM (now() - MAX(start_time))) / 86400
  INTO v_days_since_meeting
  FROM meetings
  WHERE project_id = p_project_id;

  -- Days since last activity
  IF v_client_id IS NOT NULL THEN
    SELECT
      EXTRACT(epoch FROM (now() - MAX(created_at))) / 86400
    INTO v_days_since_activity
    FROM client_activities
    WHERE client_id = v_client_id;
  END IF;

  -- Upcoming meetings count
  SELECT COUNT(*)
  INTO v_upcoming_meetings
  FROM meetings
  WHERE project_id = p_project_id
    AND start_time > now()
    AND start_time < now() + interval '14 days';

  -- Score based on communication frequency
  IF v_days_since_meeting IS NULL THEN
    v_score := v_score - 20;
  ELSIF v_days_since_meeting > 14 THEN
    v_score := v_score - 30;
  ELSIF v_days_since_meeting > 7 THEN
    v_score := v_score - 15;
  END IF;

  -- Client activity
  IF v_days_since_activity IS NOT NULL THEN
    IF v_days_since_activity > 7 THEN
      v_score := v_score - 20;
    ELSIF v_days_since_activity > 3 THEN
      v_score := v_score - 10;
    END IF;
  END IF;

  -- Bonus for upcoming meetings
  IF v_upcoming_meetings > 0 THEN
    v_score := LEAST(100, v_score + 10);
  END IF;

  RETURN GREATEST(0, LEAST(100, v_score));
END;
$$;

-- =====================================================
-- Calculate comprehensive project health
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_project_health(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project record;
  v_schedule_score integer;
  v_velocity_score integer;
  v_quality_score integer;
  v_communication_score integer;
  v_overall_score integer;
  v_metrics jsonb;
BEGIN
  -- Get project details
  SELECT * INTO v_project
  FROM projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- Calculate component scores
  SELECT calculate_schedule_health(p_project_id) INTO v_schedule_score;
  SELECT calculate_velocity_health(p_project_id) INTO v_velocity_score;
  SELECT calculate_quality_health(p_project_id) INTO v_quality_score;
  SELECT calculate_communication_health(p_project_id) INTO v_communication_score;

  -- Overall weighted score
  -- Weights: Schedule 30%, Velocity 30%, Quality 25%, Communication 15%
  v_overall_score := ROUND(
    (v_schedule_score * 0.30) +
    (v_velocity_score * 0.30) +
    (v_quality_score * 0.25) +
    (v_communication_score * 0.15)
  )::integer;

  -- Build metrics JSON
  v_metrics := jsonb_build_object(
    'overall_health_score', v_overall_score,
    'schedule_health', v_schedule_score,
    'velocity_health', v_velocity_score,
    'quality_health', v_quality_score,
    'communication_health', v_communication_score,
    'metrics_data', jsonb_build_object(
      'schedule', jsonb_build_object(
        'days_until_deadline',
          CASE
            WHEN v_project.target_date IS NULL THEN null
            ELSE EXTRACT(epoch FROM (v_project.target_date - CURRENT_DATE)) / 86400
          END,
        'roadmap_progress', calculate_roadmap_progress(p_project_id)
      ),
      'velocity', jsonb_build_object(
        'items_completed_7d', (
          SELECT COUNT(*)
          FROM phase_items pi
          JOIN project_phases pp ON pi.phase_id = pp.id
          WHERE pp.project_id = p_project_id
            AND pi.is_completed = true
            AND pi.completed_at >= now() - interval '7 days'
        )
      ),
      'quality', jsonb_build_object(
        'stale_phases', (
          SELECT COUNT(*)
          FROM project_phases
          WHERE project_id = p_project_id
            AND status = 'in_progress'
            AND updated_at < now() - interval '14 days'
        )
      ),
      'communication', jsonb_build_object(
        'days_since_meeting', (
          SELECT EXTRACT(epoch FROM (now() - MAX(start_time))) / 86400
          FROM meetings
          WHERE project_id = p_project_id
        )
      )
    )
  );

  RETURN v_metrics;
END;
$$;

-- =====================================================
-- Generate insights from health metrics
-- =====================================================
CREATE OR REPLACE FUNCTION generate_project_insights(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_health jsonb;
  v_workspace_id uuid;
  v_schedule_health integer;
  v_velocity_health integer;
  v_quality_health integer;
  v_communication_health integer;
  v_metrics jsonb;
BEGIN
  -- Get project workspace
  SELECT workspace_id INTO v_workspace_id FROM projects WHERE id = p_project_id;

  -- Calculate current health
  SELECT calculate_project_health(p_project_id) INTO v_health;

  v_schedule_health := (v_health->>'schedule_health')::integer;
  v_velocity_health := (v_health->>'velocity_health')::integer;
  v_quality_health := (v_health->>'quality_health')::integer;
  v_communication_health := (v_health->>'communication_health')::integer;
  v_metrics := v_health->'metrics_data';

  -- Clear old active insights for this project
  UPDATE project_health_insights
  SET status = 'resolved', resolved_at = now()
  WHERE project_id = p_project_id AND status = 'active';

  -- DEADLINE RISK
  IF v_schedule_health < 50 THEN
    INSERT INTO project_health_insights
    (project_id, workspace_id, insight_type, severity, title, description, recommendations, triggered_by)
    VALUES (
      p_project_id,
      v_workspace_id,
      'deadline_risk',
      CASE WHEN v_schedule_health < 30 THEN 'critical' ELSE 'warning' END,
      'Project at risk of missing deadline',
      format('Schedule health is at %s%%. Project is behind expected progress.', v_schedule_health),
      jsonb_build_array(
        jsonb_build_object(
          'action', 'Review roadmap and adjust timeline',
          'priority', 'high',
          'estimated_impact', 'Realign expectations with client'
        ),
        jsonb_build_object(
          'action', 'Identify blockers and critical path items',
          'priority', 'high',
          'estimated_impact', 'Focus team on highest priority tasks'
        )
      ),
      jsonb_build_object('schedule_health', v_schedule_health, 'metrics', v_metrics->'schedule')
    );
  END IF;

  -- VELOCITY DROP
  IF v_velocity_health < 60 THEN
    INSERT INTO project_health_insights
    (project_id, workspace_id, insight_type, severity, title, description, recommendations, triggered_by)
    VALUES (
      p_project_id,
      v_workspace_id,
      'velocity_drop',
      'warning',
      'Team velocity is low',
      'Task completion rate needs improvement.',
      jsonb_build_array(
        jsonb_build_object(
          'action', 'Review task priorities',
          'priority', 'medium',
          'estimated_impact', 'Focus on high-impact items'
        )
      ),
      jsonb_build_object('velocity_health', v_velocity_health, 'metrics', v_metrics->'velocity')
    );
  END IF;

  -- COMMUNICATION GAP
  IF v_communication_health < 70 THEN
    INSERT INTO project_health_insights
    (project_id, workspace_id, insight_type, severity, title, description, recommendations, triggered_by)
    VALUES (
      p_project_id,
      v_workspace_id,
      'communication_gap',
      CASE WHEN v_communication_health < 50 THEN 'warning' ELSE 'info' END,
      'Limited recent client communication',
      'No recent meetings or client activity detected.',
      jsonb_build_array(
        jsonb_build_object(
          'action', 'Schedule client check-in',
          'priority', 'medium',
          'estimated_impact', 'Maintain alignment and gather feedback'
        )
      ),
      jsonb_build_object('communication_health', v_communication_health, 'metrics', v_metrics->'communication')
    );
  END IF;
END;
$$;

-- =====================================================
-- Materialized View: Current Project Health
-- =====================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.project_health_current AS
SELECT DISTINCT ON (p.id)
  p.id as project_id,
  p.name as project_name,
  p.status as project_status,
  p.project_type,
  p.start_date,
  p.target_date,
  p.workspace_id,

  -- Latest health metrics
  phm.overall_health_score,
  phm.schedule_health,
  phm.velocity_health,
  phm.quality_health,
  phm.communication_health,
  phm.metrics_data,
  phm.measured_at as last_measured_at,

  -- Lead info
  pr.id as lead_id,
  pr.full_name as lead_name,
  pr.email as lead_email,

  -- Client info
  c.id as client_id,
  c.display_name as client_name,
  c.lead_status as client_status,

  -- Active insights count
  (
    SELECT COUNT(*)
    FROM project_health_insights phi
    WHERE phi.project_id = p.id
    AND phi.status = 'active'
  ) as active_insights_count,

  -- Critical insights count
  (
    SELECT COUNT(*)
    FROM project_health_insights phi
    WHERE phi.project_id = p.id
    AND phi.status = 'active'
    AND phi.severity = 'critical'
  ) as critical_insights_count,

  -- Recent trend (last 7 days avg vs previous 7 days)
  (
    SELECT
      CASE
        WHEN AVG(CASE WHEN phm2.measured_at >= now() - interval '7 days' THEN phm2.overall_health_score END) >
             AVG(CASE WHEN phm2.measured_at < now() - interval '7 days'
                      AND phm2.measured_at >= now() - interval '14 days'
                      THEN phm2.overall_health_score END)
        THEN 'improving'
        WHEN AVG(CASE WHEN phm2.measured_at >= now() - interval '7 days' THEN phm2.overall_health_score END) <
             AVG(CASE WHEN phm2.measured_at < now() - interval '7 days'
                      AND phm2.measured_at >= now() - interval '14 days'
                      THEN phm2.overall_health_score END)
        THEN 'declining'
        ELSE 'stable'
      END as trend
    FROM project_health_metrics phm2
    WHERE phm2.project_id = p.id
    AND phm2.measured_at >= now() - interval '14 days'
  ) as health_trend

FROM public.projects p
LEFT JOIN public.project_health_metrics phm ON p.id = phm.project_id
LEFT JOIN public.profiles pr ON p.lead_id = pr.id
LEFT JOIN public.clients c ON p.client_id = c.id
WHERE p.status NOT IN ('archived', 'canceled')
ORDER BY p.id, phm.measured_at DESC NULLS LAST;

-- Indexes on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_health_current_project ON project_health_current(project_id);
CREATE INDEX IF NOT EXISTS idx_health_current_workspace ON project_health_current(workspace_id);
CREATE INDEX IF NOT EXISTS idx_health_current_health_score ON project_health_current(overall_health_score);

-- Helper to refresh the view
CREATE OR REPLACE FUNCTION refresh_project_health_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY project_health_current;
END;
$$;

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE public.project_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_health_insights ENABLE ROW LEVEL SECURITY;

-- Metrics policies
CREATE POLICY "Users can view health metrics in their workspace"
ON project_health_metrics FOR SELECT TO authenticated
USING (is_admin() OR is_workspace_member(workspace_id));

CREATE POLICY "System can insert health metrics"
ON project_health_metrics FOR INSERT TO authenticated
WITH CHECK (is_admin() OR is_workspace_member(workspace_id));

-- Insights policies
CREATE POLICY "Users can view insights in their workspace"
ON project_health_insights FOR SELECT TO authenticated
USING (is_admin() OR is_workspace_member(workspace_id));

CREATE POLICY "Users can update insights in their workspace"
ON project_health_insights FOR UPDATE TO authenticated
USING (is_admin() OR is_workspace_member(workspace_id));

-- =====================================================
-- Initialize health data for existing projects
-- =====================================================
DO $$
DECLARE
  v_project record;
  v_health jsonb;
BEGIN
  -- For each active project
  FOR v_project IN
    SELECT id, workspace_id
    FROM projects
    WHERE status NOT IN ('archived', 'canceled')
  LOOP
    -- Calculate initial health
    SELECT calculate_project_health(v_project.id) INTO v_health;

    -- Insert initial metrics
    INSERT INTO project_health_metrics (
      project_id,
      workspace_id,
      overall_health_score,
      schedule_health,
      velocity_health,
      quality_health,
      communication_health,
      metrics_data
    ) VALUES (
      v_project.id,
      v_project.workspace_id,
      (v_health->>'overall_health_score')::integer,
      (v_health->>'schedule_health')::integer,
      (v_health->>'velocity_health')::integer,
      (v_health->>'quality_health')::integer,
      (v_health->>'communication_health')::integer,
      v_health->'metrics_data'
    );

    -- Generate initial insights
    PERFORM generate_project_insights(v_project.id);
  END LOOP;

  -- Refresh materialized view
  REFRESH MATERIALIZED VIEW project_health_current;
END $$;