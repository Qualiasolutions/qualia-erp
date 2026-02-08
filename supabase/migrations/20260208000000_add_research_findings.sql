-- ============================================================================
-- Research Findings Table
-- ============================================================================
-- Stores daily research findings from team members using Gemini Deep Research
-- and NotebookLM. Part of the Research Lab feature at /research
-- ============================================================================

-- Create research_findings table
CREATE TABLE IF NOT EXISTS research_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Research content
  topic TEXT NOT NULL,
  topic_category TEXT NOT NULL CHECK (topic_category IN (
    'lead_generation',
    'competitor_analysis',
    'ai_tools',
    'voice_ai_trends',
    'partnerships',
    'industry_deep_dive',
    'seo_content',
    'pricing_strategies'
  )),
  summary TEXT,

  -- Dynamic fields stored as arrays
  key_findings TEXT[] DEFAULT '{}',
  action_items TEXT[] DEFAULT '{}',
  source_links TEXT[] DEFAULT '{}',

  -- Metadata
  research_date DATE NOT NULL DEFAULT CURRENT_DATE,
  gemini_used BOOLEAN NOT NULL DEFAULT true,
  notebooklm_used BOOLEAN NOT NULL DEFAULT true,
  time_spent_minutes INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_research_findings_workspace ON research_findings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_research_findings_created_by ON research_findings(created_by);
CREATE INDEX IF NOT EXISTS idx_research_findings_research_date ON research_findings(research_date DESC);
CREATE INDEX IF NOT EXISTS idx_research_findings_topic_category ON research_findings(topic_category);
CREATE INDEX IF NOT EXISTS idx_research_findings_workspace_category ON research_findings(workspace_id, topic_category);

-- Enable RLS
ALTER TABLE research_findings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can read any research in their workspace
CREATE POLICY research_findings_select_workspace
  ON research_findings FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE profile_id = auth.uid())
  );

-- RLS Policies: Authenticated users can insert in their workspace
CREATE POLICY research_findings_insert_workspace
  ON research_findings FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE profile_id = auth.uid())
    AND created_by = auth.uid()
  );

-- RLS Policies: Users can update only their own findings
CREATE POLICY research_findings_update_own
  ON research_findings FOR UPDATE
  USING (
    created_by = auth.uid()
  )
  WITH CHECK (
    created_by = auth.uid()
  );

-- RLS Policies: Users can delete only their own findings
CREATE POLICY research_findings_delete_own
  ON research_findings FOR DELETE
  USING (created_by = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_research_findings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER research_findings_updated_at
  BEFORE UPDATE ON research_findings
  FOR EACH ROW
  EXECUTE FUNCTION update_research_findings_updated_at();

-- Add helpful comment
COMMENT ON TABLE research_findings IS 'Stores daily research findings from team members using AI tools (Gemini Deep Research, NotebookLM)';
