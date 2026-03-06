-- Create notification_delivery_method enum
CREATE TYPE notification_delivery_method AS ENUM ('email', 'in_app', 'both');

-- Create notification_preferences table
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Notification toggles
  task_assigned BOOLEAN NOT NULL DEFAULT true,
  task_due_soon BOOLEAN NOT NULL DEFAULT true,
  project_update BOOLEAN NOT NULL DEFAULT true,
  meeting_reminder BOOLEAN NOT NULL DEFAULT true,
  client_activity BOOLEAN NOT NULL DEFAULT true,

  -- Delivery method
  delivery_method notification_delivery_method NOT NULL DEFAULT 'both',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure one preference row per user per workspace
  UNIQUE(user_id, workspace_id)
);

-- Create indexes for efficient queries
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_workspace_id ON notification_preferences(workspace_id);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own preferences
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own preferences
CREATE POLICY "Users can create their own notification preferences"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own preferences
CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own preferences
CREATE POLICY "Users can delete their own notification preferences"
  ON notification_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Add comment for documentation
COMMENT ON TABLE notification_preferences IS 'User notification preferences per workspace - controls which notifications to receive and delivery method';
