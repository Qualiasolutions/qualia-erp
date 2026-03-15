-- Restore ai_platform enum value that was lost during types regeneration
ALTER TYPE project_type ADD VALUE IF NOT EXISTS 'ai_platform';
