-- Create project_assignments table for employee-project assignments
CREATE TABLE IF NOT EXISTS project_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_by uuid NOT NULL REFERENCES profiles(id),
    assigned_at timestamptz NOT NULL DEFAULT now(),
    removed_at timestamptz NULL,
    removed_by uuid NULL REFERENCES profiles(id),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    notes text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_employee_id ON project_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_workspace_id ON project_assignments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_active_lookup ON project_assignments(project_id, employee_id, removed_at);

-- Create unique constraint to prevent duplicate active assignments
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_assignments_unique_active 
ON project_assignments(project_id, employee_id) 
WHERE removed_at IS NULL;

-- Enable RLS
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Workspace members can view assignments in their workspace
CREATE POLICY "Workspace members can view assignments"
ON project_assignments
FOR SELECT
USING (
    workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE profile_id = auth.uid()
    )
);

-- RLS Policy: Admin role can insert assignments
CREATE POLICY "Admins can insert assignments"
ON project_assignments
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- RLS Policy: Admin role can update assignments
CREATE POLICY "Admins can update assignments"
ON project_assignments
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- RLS Policy: Admin role can delete assignments
CREATE POLICY "Admins can delete assignments"
ON project_assignments
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- Add comment for documentation
COMMENT ON TABLE project_assignments IS 'Tracks which employees are assigned to which projects with complete audit trail';
