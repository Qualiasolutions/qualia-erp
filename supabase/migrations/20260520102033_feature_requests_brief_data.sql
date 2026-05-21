-- Structured brief storage on feature requests.
--
-- Background: client project briefs (intake forms in components/portal/briefs/*)
-- currently submit through createFeatureRequest with all answers concatenated
-- into a markdown blob in `description`. That makes it impossible to render the
-- brief as structured Q&A inside the project page without parsing markdown.
--
-- This column stores the canonical structured payload at submission time so
-- the project detail page can iterate sections without parsing. Old rows that
-- pre-date this column stay NULL — the viewer falls back to markdown parsing.
--
-- Shape (TypeScript):
--   type BriefData = {
--     variant: string;                // e.g. 'generic' | 'kartatic' | 'networking'
--     submitted_at: string;           // ISO timestamp from the client
--     sections: Array<{
--       key: string;                  // 'goals' | 'audience' | ...
--       label: string;                // 'Goals'
--       values?: string[];            // chip selections
--       value?: string;               // single chip or free text
--       note?: string;                // optional companion note
--     }>;
--   }
--
-- No CHECK constraint — the shape is enforced application-side via Zod in
-- lib/validation.ts to keep schema migrations cheap if we evolve the payload.

ALTER TABLE public.client_feature_requests
  ADD COLUMN IF NOT EXISTS brief_data jsonb;

-- Composite index supporting "give me the latest brief for this project".
-- Partial — only briefs (rows where brief_data is set) are interesting.
CREATE INDEX IF NOT EXISTS client_feature_requests_brief_data_project_idx
  ON public.client_feature_requests (project_id, created_at DESC)
  WHERE brief_data IS NOT NULL;

COMMENT ON COLUMN public.client_feature_requests.brief_data IS
  'Structured intake-form payload at submission. NULL for non-brief requests and for briefs created before 2026-05-20 (those fall back to markdown parsing of description).';
