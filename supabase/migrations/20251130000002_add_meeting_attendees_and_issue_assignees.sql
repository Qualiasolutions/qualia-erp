-- Create meeting_attendees junction table
CREATE TABLE public.meeting_attendees (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'tentative')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(meeting_id, profile_id)
);

-- Create issue_assignees junction table (many-to-many for issues and profiles)
CREATE TABLE public.issue_assignees (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_at timestamptz DEFAULT now(),
    assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    UNIQUE(issue_id, profile_id)
);

-- Enable RLS
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_assignees ENABLE ROW LEVEL SECURITY;

-- Meeting attendees policies
CREATE POLICY "Authenticated users can view meeting attendees" ON public.meeting_attendees
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert meeting attendees" ON public.meeting_attendees
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update meeting attendees" ON public.meeting_attendees
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete meeting attendees" ON public.meeting_attendees
    FOR DELETE TO authenticated USING (true);

-- Issue assignees policies
CREATE POLICY "Authenticated users can view issue assignees" ON public.issue_assignees
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert issue assignees" ON public.issue_assignees
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update issue assignees" ON public.issue_assignees
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete issue assignees" ON public.issue_assignees
    FOR DELETE TO authenticated USING (true);

-- Add indexes for performance
CREATE INDEX idx_meeting_attendees_meeting_id ON public.meeting_attendees(meeting_id);
CREATE INDEX idx_meeting_attendees_profile_id ON public.meeting_attendees(profile_id);
CREATE INDEX idx_issue_assignees_issue_id ON public.issue_assignees(issue_id);
CREATE INDEX idx_issue_assignees_profile_id ON public.issue_assignees(profile_id);
