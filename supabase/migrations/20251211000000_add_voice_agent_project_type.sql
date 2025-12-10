-- Add voice_agent to project_type enum
-- This enables Voice Agent projects (VAPI, ElevenLabs phone bots)

-- Add the new enum value
ALTER TYPE project_type ADD VALUE IF NOT EXISTS 'voice_agent';

-- Add comment for documentation
COMMENT ON TYPE project_type IS 'Project types: web_design, ai_agent, voice_agent, seo, ads';
