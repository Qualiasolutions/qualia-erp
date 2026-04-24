-- Tighten destructive/collaborative project RLS so the database boundary
-- matches the stricter server-action authorization model.
--
-- Previous late-April hotfixes allowed any workspace member to update/delete
-- tasks and manage project phases. That fixed false-success UI failures, but
-- it made direct Supabase client calls broader than app-level permissions.

-- ============ tasks UPDATE / DELETE ============

DROP POLICY IF EXISTS "Users can update tasks in their workspace" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their workspace" ON public.tasks;

CREATE POLICY "Users can update tasks they can modify"
ON public.tasks
FOR UPDATE TO authenticated
USING (
  is_admin()
  OR is_workspace_admin(workspace_id)
  OR creator_id = (SELECT auth.uid())
  OR assignee_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = tasks.project_id
      AND p.lead_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_assignments pa
    WHERE pa.project_id = tasks.project_id
      AND pa.employee_id = (SELECT auth.uid())
      AND pa.removed_at IS NULL
  )
)
WITH CHECK (
  is_admin()
  OR is_workspace_admin(workspace_id)
  OR creator_id = (SELECT auth.uid())
  OR assignee_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = tasks.project_id
      AND p.lead_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_assignments pa
    WHERE pa.project_id = tasks.project_id
      AND pa.employee_id = (SELECT auth.uid())
      AND pa.removed_at IS NULL
  )
);

CREATE POLICY "Users can delete tasks they can modify"
ON public.tasks
FOR DELETE TO authenticated
USING (
  is_admin()
  OR is_workspace_admin(workspace_id)
  OR creator_id = (SELECT auth.uid())
  OR assignee_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = tasks.project_id
      AND p.lead_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_assignments pa
    WHERE pa.project_id = tasks.project_id
      AND pa.employee_id = (SELECT auth.uid())
      AND pa.removed_at IS NULL
  )
);

-- ============ project_phases INSERT / UPDATE / DELETE ============

DROP POLICY IF EXISTS "Workspace members can insert phases" ON public.project_phases;
DROP POLICY IF EXISTS "Workspace members can update phases" ON public.project_phases;
DROP POLICY IF EXISTS "Workspace members can delete phases" ON public.project_phases;

CREATE POLICY "Project members can insert phases"
ON public.project_phases
FOR INSERT TO authenticated
WITH CHECK (
  is_admin()
  OR is_workspace_admin(workspace_id)
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_phases.project_id
      AND p.lead_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_assignments pa
    WHERE pa.project_id = project_phases.project_id
      AND pa.employee_id = (SELECT auth.uid())
      AND pa.removed_at IS NULL
  )
);

CREATE POLICY "Project members can update phases"
ON public.project_phases
FOR UPDATE TO authenticated
USING (
  is_admin()
  OR is_workspace_admin(workspace_id)
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_phases.project_id
      AND p.lead_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_assignments pa
    WHERE pa.project_id = project_phases.project_id
      AND pa.employee_id = (SELECT auth.uid())
      AND pa.removed_at IS NULL
  )
)
WITH CHECK (
  is_admin()
  OR is_workspace_admin(workspace_id)
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_phases.project_id
      AND p.lead_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_assignments pa
    WHERE pa.project_id = project_phases.project_id
      AND pa.employee_id = (SELECT auth.uid())
      AND pa.removed_at IS NULL
  )
);

CREATE POLICY "Project members can delete phases"
ON public.project_phases
FOR DELETE TO authenticated
USING (
  is_admin()
  OR is_workspace_admin(workspace_id)
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_phases.project_id
      AND p.lead_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_assignments pa
    WHERE pa.project_id = project_phases.project_id
      AND pa.employee_id = (SELECT auth.uid())
      AND pa.removed_at IS NULL
  )
);

-- ============ phase_items DELETE ============

DROP POLICY IF EXISTS "Workspace members can delete phase items" ON public.phase_items;

CREATE POLICY "Project members can delete phase items"
ON public.phase_items
FOR DELETE TO authenticated
USING (
  is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.project_phases pp
    JOIN public.projects p ON p.id = pp.project_id
    WHERE pp.id = phase_items.phase_id
      AND (
        is_workspace_admin(pp.workspace_id)
        OR p.lead_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.project_assignments pa
          WHERE pa.project_id = pp.project_id
            AND pa.employee_id = (SELECT auth.uid())
            AND pa.removed_at IS NULL
        )
      )
  )
);
