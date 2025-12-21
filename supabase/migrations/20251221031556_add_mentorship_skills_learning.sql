-- =====================================================
-- MIGRATION: Add Mentorship, Skills & Learning System
-- For 2-person team: Fawzi (mentor) + Moayad (trainee)
-- =====================================================

-- =====================================================
-- 1. EXTEND PROFILES FOR TRAINEE FEATURES
-- =====================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_trainee boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS mentor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS learn_mode boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_xp integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_streak integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_date date;

-- =====================================================
-- 2. SKILL CATEGORIES & SKILLS
-- =====================================================

-- Skill categories (AI, Voice, Web, etc.)
CREATE TABLE IF NOT EXISTS public.skill_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'code',
  color text NOT NULL DEFAULT 'slate',
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Individual skills within categories
CREATE TABLE IF NOT EXISTS public.skills (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid REFERENCES public.skill_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  project_types text[] DEFAULT '{}',
  complexity_level integer DEFAULT 1 CHECK (complexity_level BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now(),
  UNIQUE(category_id, name)
);

-- User skill proficiency tracking
CREATE TABLE IF NOT EXISTS public.user_skills (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  skill_id uuid REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
  proficiency_level integer DEFAULT 1 CHECK (proficiency_level BETWEEN 1 AND 5),
  times_practiced integer DEFAULT 0,
  xp_earned integer DEFAULT 0,
  last_practiced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, skill_id)
);

-- Skill practice log for activity tracking
CREATE TABLE IF NOT EXISTS public.skill_practice_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  skill_id uuid REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('phase_item', 'issue', 'project', 'manual')),
  source_id uuid,
  xp_earned integer DEFAULT 10,
  notes text,
  practiced_at timestamptz DEFAULT now()
);

-- =====================================================
-- 3. ACHIEVEMENTS/BADGES SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  category text NOT NULL CHECK (category IN ('consistency', 'milestone', 'mastery', 'speed', 'quality')),
  rarity text DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  unlock_conditions jsonb NOT NULL DEFAULT '{}',
  xp_reward integer DEFAULT 10,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id uuid REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  earned_at timestamptz DEFAULT now(),
  is_seen boolean DEFAULT false,
  UNIQUE(profile_id, achievement_id)
);

-- =====================================================
-- 4. TASK DIFFICULTY & LEARNING FIELDS
-- =====================================================

-- Add difficulty and learning fields to issues
ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'medium' CHECK (difficulty IN ('starter', 'easy', 'medium', 'hard', 'expert')),
  ADD COLUMN IF NOT EXISTS learning_objective text,
  ADD COLUMN IF NOT EXISTS why_it_matters text,
  ADD COLUMN IF NOT EXISTS estimated_minutes_experienced integer,
  ADD COLUMN IF NOT EXISTS estimated_minutes_trainee integer,
  ADD COLUMN IF NOT EXISTS requires_review boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_status text CHECK (review_status IN ('pending', 'approved', 'needs_revision')),
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Add difficulty to tasks (inbox)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'easy' CHECK (difficulty IN ('starter', 'easy', 'medium', 'hard', 'expert')),
  ADD COLUMN IF NOT EXISTS learning_objective text,
  ADD COLUMN IF NOT EXISTS estimated_minutes_trainee integer;

-- Add difficulty to phase items
ALTER TABLE public.phase_items
  ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'easy' CHECK (difficulty IN ('starter', 'easy', 'medium', 'hard', 'expert')),
  ADD COLUMN IF NOT EXISTS estimated_minutes_trainee integer;

-- =====================================================
-- 5. ISSUE SKILLS JUNCTION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.issue_skills (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id uuid REFERENCES public.issues(id) ON DELETE CASCADE NOT NULL,
  skill_id uuid REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
  is_primary boolean DEFAULT false,
  UNIQUE(issue_id, skill_id)
);

-- =====================================================
-- 6. TEACHING NOTES (Mentor annotations)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.teaching_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id uuid REFERENCES public.issues(id) ON DELETE CASCADE,
  phase_item_id uuid REFERENCES public.phase_items(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note_type text NOT NULL CHECK (note_type IN ('hint', 'explanation', 'resource', 'warning', 'encouragement')),
  content text NOT NULL,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CHECK (issue_id IS NOT NULL OR phase_item_id IS NOT NULL)
);

-- =====================================================
-- 7. TASK REFLECTIONS (Trainee learning log)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.task_reflections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id uuid REFERENCES public.issues(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  what_learned text,
  challenges_faced text,
  time_spent_minutes integer,
  difficulty_rating integer CHECK (difficulty_rating BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now(),
  CHECK (issue_id IS NOT NULL OR task_id IS NOT NULL)
);

-- =====================================================
-- 8. EXTEND ISSUE ASSIGNEES FOR MENTOR TRACKING
-- =====================================================

ALTER TABLE public.issue_assignees
  ADD COLUMN IF NOT EXISTS assignment_type text DEFAULT 'self' CHECK (assignment_type IN ('mentor', 'self', 'system')),
  ADD COLUMN IF NOT EXISTS assignment_context text,
  ADD COLUMN IF NOT EXISTS mentor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- =====================================================
-- 9. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_skills_profile ON public.user_skills(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill ON public.user_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_practice_log_profile ON public.skill_practice_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_skill_practice_log_date ON public.skill_practice_log(practiced_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_profile ON public.user_achievements(profile_id);
CREATE INDEX IF NOT EXISTS idx_teaching_notes_issue ON public.teaching_notes(issue_id);
CREATE INDEX IF NOT EXISTS idx_teaching_notes_phase_item ON public.teaching_notes(phase_item_id);
CREATE INDEX IF NOT EXISTS idx_issue_skills_issue ON public.issue_skills(issue_id);
CREATE INDEX IF NOT EXISTS idx_issues_difficulty ON public.issues(difficulty);
CREATE INDEX IF NOT EXISTS idx_issues_requires_review ON public.issues(requires_review) WHERE requires_review = true;

-- =====================================================
-- 10. RLS POLICIES
-- =====================================================

ALTER TABLE public.skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_practice_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_skills ENABLE ROW LEVEL SECURITY;

-- Everyone can view skill categories and skills
CREATE POLICY "Anyone can view skill categories" ON public.skill_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can view skills" ON public.skills FOR SELECT USING (true);
CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT USING (true);

-- Users can view and manage their own skill data
CREATE POLICY "Users view own skills" ON public.user_skills FOR SELECT USING (profile_id = auth.uid() OR is_admin());
CREATE POLICY "Users update own skills" ON public.user_skills FOR UPDATE USING (profile_id = auth.uid());
CREATE POLICY "Users insert own skills" ON public.user_skills FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users view own practice log" ON public.skill_practice_log FOR SELECT USING (profile_id = auth.uid() OR is_admin());
CREATE POLICY "Users insert own practice log" ON public.skill_practice_log FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users view own achievements" ON public.user_achievements FOR SELECT USING (profile_id = auth.uid() OR is_admin());
CREATE POLICY "Users insert own achievements" ON public.user_achievements FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Users update own achievements" ON public.user_achievements FOR UPDATE USING (profile_id = auth.uid());

-- Teaching notes: mentors can create, trainees can view on their issues
CREATE POLICY "View teaching notes" ON public.teaching_notes FOR SELECT USING (true);
CREATE POLICY "Mentors create teaching notes" ON public.teaching_notes FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Mentors update teaching notes" ON public.teaching_notes FOR UPDATE USING (mentor_id = auth.uid() OR is_admin());
CREATE POLICY "Mentors delete teaching notes" ON public.teaching_notes FOR DELETE USING (mentor_id = auth.uid() OR is_admin());

-- Task reflections
CREATE POLICY "Users view own reflections" ON public.task_reflections FOR SELECT USING (profile_id = auth.uid() OR is_admin());
CREATE POLICY "Users create own reflections" ON public.task_reflections FOR INSERT WITH CHECK (profile_id = auth.uid());

-- Issue skills visible to all authenticated
CREATE POLICY "Anyone can view issue skills" ON public.issue_skills FOR SELECT USING (true);
CREATE POLICY "Authenticated users manage issue skills" ON public.issue_skills FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 11. SEED SKILL CATEGORIES & SKILLS
-- =====================================================

INSERT INTO public.skill_categories (name, description, icon, color, display_order) VALUES
  ('AI & LLMs', 'Language models, prompting, AI agents', 'bot', 'violet', 1),
  ('Voice AI', 'Voice agents, VAPI, ElevenLabs, telephony', 'mic', 'blue', 2),
  ('Frontend', 'React, Next.js, TypeScript, Tailwind', 'layout', 'cyan', 3),
  ('Backend', 'Supabase, databases, APIs, webhooks', 'database', 'emerald', 4),
  ('DevOps', 'Vercel, Git, CI/CD, deployment', 'cloud', 'orange', 5),
  ('Design', 'UI/UX, Figma, responsive design', 'palette', 'pink', 6)
ON CONFLICT DO NOTHING;

-- AI Skills
INSERT INTO public.skills (category_id, name, description, project_types, complexity_level)
SELECT c.id, s.name, s.description, s.project_types, s.complexity_level
FROM skill_categories c
CROSS JOIN (VALUES
  ('System Prompt Engineering', 'Crafting effective AI prompts', ARRAY['ai_agent', 'voice_agent'], 3),
  ('Tool/Function Calling', 'Implementing AI tool use', ARRAY['ai_agent', 'voice_agent'], 4),
  ('RAG & Knowledge Bases', 'Vector databases and retrieval', ARRAY['ai_agent'], 4),
  ('LangChain Basics', 'Building with LangChain', ARRAY['ai_agent'], 3)
) AS s(name, description, project_types, complexity_level)
WHERE c.name = 'AI & LLMs'
ON CONFLICT DO NOTHING;

-- Voice AI Skills
INSERT INTO public.skills (category_id, name, description, project_types, complexity_level)
SELECT c.id, s.name, s.description, s.project_types, s.complexity_level
FROM skill_categories c
CROSS JOIN (VALUES
  ('VAPI Configuration', 'Setting up VAPI assistants', ARRAY['voice_agent'], 2),
  ('Voice Prompt Design', 'Writing conversational prompts', ARRAY['voice_agent'], 3),
  ('Webhook Development', 'Building voice tool webhooks', ARRAY['voice_agent', 'ai_agent'], 3),
  ('ElevenLabs TTS', 'Voice synthesis configuration', ARRAY['voice_agent'], 2)
) AS s(name, description, project_types, complexity_level)
WHERE c.name = 'Voice AI'
ON CONFLICT DO NOTHING;

-- Frontend Skills
INSERT INTO public.skills (category_id, name, description, project_types, complexity_level)
SELECT c.id, s.name, s.description, s.project_types, s.complexity_level
FROM skill_categories c
CROSS JOIN (VALUES
  ('Next.js App Router', 'Server components, routing', ARRAY['web_design'], 3),
  ('React Components', 'Building reusable components', ARRAY['web_design'], 2),
  ('Tailwind CSS', 'Utility-first styling', ARRAY['web_design'], 2),
  ('TypeScript', 'Type-safe JavaScript', ARRAY['web_design', 'ai_agent'], 3),
  ('Responsive Design', 'Mobile-first layouts', ARRAY['web_design'], 2)
) AS s(name, description, project_types, complexity_level)
WHERE c.name = 'Frontend'
ON CONFLICT DO NOTHING;

-- Backend Skills
INSERT INTO public.skills (category_id, name, description, project_types, complexity_level)
SELECT c.id, s.name, s.description, s.project_types, s.complexity_level
FROM skill_categories c
CROSS JOIN (VALUES
  ('Supabase Basics', 'Database, auth, storage', ARRAY['web_design', 'ai_agent'], 2),
  ('PostgreSQL', 'SQL queries and schema design', ARRAY['web_design', 'ai_agent'], 3),
  ('RLS Policies', 'Row-level security', ARRAY['web_design'], 4),
  ('API Design', 'RESTful endpoints', ARRAY['web_design', 'ai_agent'], 3),
  ('Server Actions', 'Next.js server mutations', ARRAY['web_design'], 3)
) AS s(name, description, project_types, complexity_level)
WHERE c.name = 'Backend'
ON CONFLICT DO NOTHING;

-- DevOps Skills
INSERT INTO public.skills (category_id, name, description, project_types, complexity_level)
SELECT c.id, s.name, s.description, s.project_types, s.complexity_level
FROM skill_categories c
CROSS JOIN (VALUES
  ('Git Basics', 'Version control fundamentals', ARRAY['web_design', 'ai_agent', 'voice_agent'], 1),
  ('Vercel Deployment', 'Deploying to production', ARRAY['web_design', 'ai_agent'], 2),
  ('Environment Variables', 'Managing secrets', ARRAY['web_design', 'ai_agent', 'voice_agent'], 2),
  ('CI/CD', 'Automated testing and deployment', ARRAY['web_design'], 3)
) AS s(name, description, project_types, complexity_level)
WHERE c.name = 'DevOps'
ON CONFLICT DO NOTHING;

-- Design Skills
INSERT INTO public.skills (category_id, name, description, project_types, complexity_level)
SELECT c.id, s.name, s.description, s.project_types, s.complexity_level
FROM skill_categories c
CROSS JOIN (VALUES
  ('UI Components', 'shadcn/ui, Radix primitives', ARRAY['web_design'], 2),
  ('Color Theory', 'Palette selection, theming', ARRAY['web_design'], 2),
  ('Accessibility', 'WCAG compliance, a11y', ARRAY['web_design'], 3),
  ('Animation', 'Framer Motion, transitions', ARRAY['web_design'], 3)
) AS s(name, description, project_types, complexity_level)
WHERE c.name = 'Design'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 12. SEED ACHIEVEMENTS
-- =====================================================

INSERT INTO public.achievements (name, description, icon, category, rarity, unlock_conditions, xp_reward) VALUES
  ('First Steps', 'Complete your first task', '🎯', 'milestone', 'common', '{"type": "tasks_completed", "count": 1}', 10),
  ('Getting Started', 'Complete 10 tasks', '🚀', 'milestone', 'common', '{"type": "tasks_completed", "count": 10}', 25),
  ('Task Master', 'Complete 50 tasks', '⭐', 'milestone', 'rare', '{"type": "tasks_completed", "count": 50}', 100),
  ('Dedicated Learner', 'Practice 7 days in a row', '🔥', 'consistency', 'rare', '{"type": "streak", "days": 7}', 50),
  ('Unstoppable', 'Practice 30 days in a row', '⚡', 'consistency', 'epic', '{"type": "streak", "days": 30}', 150),
  ('Skill Explorer', 'Practice 5 different skills', '🗺️', 'mastery', 'common', '{"type": "skills_practiced", "count": 5}', 20),
  ('Specialist', 'Reach level 4 in any skill', '🏅', 'mastery', 'rare', '{"type": "skill_level", "level": 4}', 75),
  ('AI Builder', 'Complete an AI agent project', '🤖', 'milestone', 'rare', '{"type": "project_type", "project_type": "ai_agent"}', 100),
  ('Voice Virtuoso', 'Complete a voice agent project', '🎙️', 'milestone', 'rare', '{"type": "project_type", "project_type": "voice_agent"}', 100),
  ('Speed Demon', 'Complete 5 tasks in one day', '💨', 'speed', 'rare', '{"type": "daily_tasks", "count": 5}', 50),
  ('Perfect Review', 'Get a task approved with no revisions', '✅', 'quality', 'common', '{"type": "no_revisions"}', 25)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 13. SET MOAYAD AS TRAINEE (if exists)
-- =====================================================

UPDATE public.profiles
SET is_trainee = true, learn_mode = true
WHERE email ILIKE '%moayad%' OR full_name ILIKE '%moayad%';

-- Set Fawzi as mentor for Moayad
UPDATE public.profiles p
SET mentor_id = (SELECT id FROM public.profiles WHERE email ILIKE '%fawzi%' OR full_name ILIKE '%fawzi%' LIMIT 1)
WHERE p.is_trainee = true;
