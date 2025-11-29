-- Add missing RLS (Row Level Security) policies for DELETE and UPDATE operations
-- These policies were missing, causing silent failures on delete/update operations

-- Add DELETE policy for projects
CREATE POLICY "Authenticated users can delete projects"
ON public.projects FOR DELETE TO authenticated USING (true);

-- Add DELETE policy for issues
CREATE POLICY "Authenticated users can delete issues"
ON public.issues FOR DELETE TO authenticated USING (true);

-- Add UPDATE and DELETE policies for teams
CREATE POLICY "Authenticated users can update teams"
ON public.teams FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete teams"
ON public.teams FOR DELETE TO authenticated USING (true);

-- Add UPDATE and DELETE policies for comments
CREATE POLICY "Authenticated users can update comments"
ON public.comments FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete comments"
ON public.comments FOR DELETE TO authenticated USING (true);
