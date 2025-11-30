"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResult = {
    success: boolean;
    error?: string;
    data?: unknown;
};

// Activity types that match the database enum
type ActivityType =
    | 'project_created'
    | 'project_updated'
    | 'issue_created'
    | 'issue_updated'
    | 'issue_completed'
    | 'comment_added'
    | 'team_created'
    | 'member_added'
    | 'meeting_created';

// ============ WORKSPACE HELPERS ============

// Get current user's default workspace ID
export async function getCurrentWorkspaceId(): Promise<string | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("profile_id", user.id)
        .eq("is_default", true)
        .single();

    return data?.workspace_id || null;
}

// Get all workspaces (for admin management)
export async function getWorkspaces() {
    const supabase = await createClient();
    const { data: workspaces } = await supabase
        .from("workspaces")
        .select("id, name, slug, logo_url, description")
        .order("name");
    return workspaces || [];
}

// Get user's workspace memberships with access info
export async function getUserWorkspaces() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    // Fetch all workspaces
    const { data: allWorkspaces } = await supabase
        .from("workspaces")
        .select("id, name, slug, logo_url, description")
        .order("name");

    // Fetch user's memberships
    const { data: memberships } = await supabase
        .from("workspace_members")
        .select("workspace_id, role, is_default")
        .eq("profile_id", user.id);

    const membershipMap = new Map(
        (memberships || []).map(m => [m.workspace_id, { role: m.role, is_default: m.is_default }])
    );

    return (allWorkspaces || []).map(ws => ({
        ...ws,
        hasAccess: membershipMap.has(ws.id),
        role: membershipMap.get(ws.id)?.role || null,
        isDefault: membershipMap.get(ws.id)?.is_default || false,
    }));
}

// Set user's default workspace
export async function setDefaultWorkspace(workspaceId: string): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    // Check if user is a member of this workspace
    const { data: membership } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("profile_id", user.id)
        .single();

    if (!membership) {
        return { success: false, error: "You don't have access to this workspace" };
    }

    // Set all other workspaces as non-default
    await supabase
        .from("workspace_members")
        .update({ is_default: false })
        .eq("profile_id", user.id);

    // Set selected workspace as default
    await supabase
        .from("workspace_members")
        .update({ is_default: true })
        .eq("workspace_id", workspaceId)
        .eq("profile_id", user.id);

    revalidatePath("/");
    return { success: true };
}

// Create a new workspace (admin only)
export async function createWorkspace(formData: FormData): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const description = formData.get("description") as string | null;

    if (!name?.trim()) {
        return { success: false, error: "Workspace name is required" };
    }

    if (!slug?.trim()) {
        return { success: false, error: "Workspace slug is required" };
    }

    const { data, error } = await supabase
        .from("workspaces")
        .insert({
            name: name.trim(),
            slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
            description: description?.trim() || null,
            created_by: user.id,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating workspace:", error);
        return { success: false, error: error.message };
    }

    // Add the creator as the workspace owner
    await supabase
        .from("workspace_members")
        .insert({
            workspace_id: data.id,
            profile_id: user.id,
            role: "owner",
            is_default: false,
        });

    revalidatePath("/");
    return { success: true, data };
}

// Add a member to a workspace
export async function addWorkspaceMember(
    workspaceId: string,
    profileId: string,
    role: string = "member"
): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
        .from("workspace_members")
        .insert({
            workspace_id: workspaceId,
            profile_id: profileId,
            role,
            is_default: false,
        });

    if (error) {
        console.error("Error adding workspace member:", error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

// Remove a member from a workspace
export async function removeWorkspaceMember(
    workspaceId: string,
    profileId: string
): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("profile_id", profileId);

    if (error) {
        console.error("Error removing workspace member:", error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

// Helper to create activity records
async function createActivity(
    supabase: Awaited<ReturnType<typeof createClient>>,
    actorId: string,
    type: ActivityType,
    refs: {
        project_id?: string | null;
        issue_id?: string | null;
        team_id?: string | null;
        comment_id?: string | null;
        meeting_id?: string | null;
        workspace_id?: string | null;
    },
    metadata?: Record<string, unknown>
) {
    try {
        await supabase.from("activities").insert({
            actor_id: actorId,
            type,
            project_id: refs.project_id || null,
            issue_id: refs.issue_id || null,
            team_id: refs.team_id || null,
            comment_id: refs.comment_id || null,
            meeting_id: refs.meeting_id || null,
            workspace_id: refs.workspace_id || null,
            metadata: metadata || {},
        });
    } catch (err) {
        // Don't fail the main operation if activity logging fails
        console.error("Failed to create activity:", err);
    }
}

export async function createIssue(formData: FormData): Promise<ActionResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const status = formData.get("status") as string || "Yet to Start";
    const priority = formData.get("priority") as string || "No Priority";
    const teamId = formData.get("team_id") as string | null;
    const projectId = formData.get("project_id") as string | null;
    const workspaceId = formData.get("workspace_id") as string | null;

    if (!title?.trim()) {
        return { success: false, error: "Title is required" };
    }

    // Get workspace ID from form or from user's default
    let wsId = workspaceId;
    if (!wsId) {
        wsId = await getCurrentWorkspaceId();
    }

    if (!wsId) {
        return { success: false, error: "Workspace is required" };
    }

    const { data, error } = await supabase
        .from("issues")
        .insert({
            title: title.trim(),
            description: description?.trim() || null,
            status,
            priority,
            team_id: teamId || null,
            project_id: projectId || null,
            creator_id: user.id,
            workspace_id: wsId,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating issue:", error);
        return { success: false, error: error.message };
    }

    // Record activity
    await createActivity(
        supabase,
        user.id,
        'issue_created',
        {
            issue_id: data.id,
            team_id: teamId,
            project_id: projectId,
            workspace_id: wsId,
        },
        { title: data.title, priority: data.priority }
    );

    revalidatePath("/issues");
    revalidatePath("/");
    return { success: true, data };
}

export async function createProject(formData: FormData): Promise<ActionResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string | null;
    const status = formData.get("status") as string || "Active";
    const teamId = formData.get("team_id") as string | null;
    const targetDate = formData.get("target_date") as string | null;
    const workspaceId = formData.get("workspace_id") as string | null;
    const projectGroup = formData.get("project_group") as string | null;

    if (!name?.trim()) {
        return { success: false, error: "Project name is required" };
    }

    if (!teamId) {
        return { success: false, error: "Team is required" };
    }

    if (!projectGroup) {
        return { success: false, error: "Project group is required" };
    }

    // Get workspace ID from form or from user's default
    let wsId = workspaceId;
    if (!wsId) {
        wsId = await getCurrentWorkspaceId();
    }

    if (!wsId) {
        return { success: false, error: "Workspace is required" };
    }

    const { data, error } = await supabase
        .from("projects")
        .insert({
            name: name.trim(),
            description: description?.trim() || null,
            status,
            team_id: teamId,
            lead_id: user.id,
            target_date: targetDate || null,
            workspace_id: wsId,
            project_group: projectGroup,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating project:", error);
        return { success: false, error: error.message };
    }

    // Record activity
    await createActivity(
        supabase,
        user.id,
        'project_created',
        {
            project_id: data.id,
            team_id: teamId,
            workspace_id: wsId,
        },
        { name: data.name, status: data.status }
    );

    revalidatePath("/projects");
    revalidatePath("/");
    return { success: true, data };
}

export async function createTeam(formData: FormData): Promise<ActionResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const name = formData.get("name") as string;
    const key = formData.get("key") as string;
    const description = formData.get("description") as string | null;
    const memberIds = formData.getAll("member_ids") as string[];
    const workspaceId = formData.get("workspace_id") as string | null;

    if (!name?.trim()) {
        return { success: false, error: "Team name is required" };
    }

    if (!key?.trim()) {
        return { success: false, error: "Team key is required" };
    }

    // Get workspace ID from form or from user's default
    let wsId = workspaceId;
    if (!wsId) {
        wsId = await getCurrentWorkspaceId();
    }

    if (!wsId) {
        return { success: false, error: "Workspace is required" };
    }

    // Create the team
    const { data: team, error } = await supabase
        .from("teams")
        .insert({
            name: name.trim(),
            key: key.trim().toUpperCase(),
            description: description?.trim() || null,
            workspace_id: wsId,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating team:", error);
        return { success: false, error: error.message };
    }

    // Add team members if any selected
    if (memberIds.length > 0 && team) {
        const teamMembers = memberIds.map((profileId) => ({
            team_id: team.id,
            profile_id: profileId,
            role: 'member',
        }));

        const { error: membersError } = await supabase
            .from("team_members")
            .insert(teamMembers);

        if (membersError) {
            console.error("Error adding team members:", membersError);
            // Team was created, but members failed - don't fail the whole operation
        }
    }

    // Record activity
    await createActivity(
        supabase,
        user.id,
        'team_created',
        { team_id: team.id, workspace_id: wsId },
        { name: team.name, key: team.key }
    );

    revalidatePath("/teams");
    revalidatePath("/");
    return { success: true, data: team };
}

export async function getTeams(workspaceId?: string | null) {
    const supabase = await createClient();

    // Get workspace ID from parameter or user's default
    let wsId = workspaceId;
    if (!wsId) {
        wsId = await getCurrentWorkspaceId();
    }

    let query = supabase
        .from("teams")
        .select("id, name, key")
        .order("name");

    if (wsId) {
        query = query.eq("workspace_id", wsId);
    }

    const { data: teams } = await query;
    return teams || [];
}

export async function getProjects(workspaceId?: string | null) {
    const supabase = await createClient();

    // Get workspace ID from parameter or user's default
    let wsId = workspaceId;
    if (!wsId) {
        wsId = await getCurrentWorkspaceId();
    }

    let query = supabase
        .from("projects")
        .select("id, name")
        .order("name");

    if (wsId) {
        query = query.eq("workspace_id", wsId);
    }

    const { data: projects } = await query;
    return projects || [];
}

export async function getProfiles() {
    const supabase = await createClient();
    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .order("full_name");
    return profiles || [];
}

// ============ FETCH BY ID ACTIONS ============

export async function getIssueById(id: string) {
    const supabase = await createClient();
    const { data: issue, error } = await supabase
        .from("issues")
        .select(`
            *,
            creator:profiles!issues_creator_id_fkey (id, full_name, email),
            project:projects (id, name),
            team:teams (id, name, key),
            comments (
                id,
                body,
                created_at,
                user:profiles (id, full_name, email, avatar_url)
            )
        `)
        .eq("id", id)
        .single();

    if (error) {
        console.error("Error fetching issue:", error);
        return null;
    }

    // Transform arrays to single objects for foreign keys
    return {
        ...issue,
        creator: Array.isArray(issue.creator) ? issue.creator[0] || null : issue.creator,
        project: Array.isArray(issue.project) ? issue.project[0] || null : issue.project,
        team: Array.isArray(issue.team) ? issue.team[0] || null : issue.team,
        comments: (issue.comments || []).map((c: { user: unknown[] | unknown }) => ({
            ...c,
            user: Array.isArray(c.user) ? c.user[0] || null : c.user,
        })),
    };
}

export async function getProjectById(id: string) {
    const supabase = await createClient();
    const { data: project, error } = await supabase
        .from("projects")
        .select(`
            *,
            lead:profiles!projects_lead_id_fkey (id, full_name, email, avatar_url),
            team:teams (id, name, key),
            client:clients (id, name)
        `)
        .eq("id", id)
        .single();

    if (error) {
        console.error("Error fetching project:", error);
        return null;
    }

    // Fetch issues separately for this project
    const { data: issues } = await supabase
        .from("issues")
        .select(`
            id,
            title,
            status,
            priority,
            created_at
        `)
        .eq("project_id", id)
        .order("created_at", { ascending: false });

    // Get issue stats
    const { count: totalIssues } = await supabase
        .from("issues")
        .select("*", { count: "exact", head: true })
        .eq("project_id", id);

    const { count: doneIssues } = await supabase
        .from("issues")
        .select("*", { count: "exact", head: true })
        .eq("project_id", id)
        .eq("status", "Done");

    return {
        ...project,
        lead: Array.isArray(project.lead) ? project.lead[0] || null : project.lead,
        team: Array.isArray(project.team) ? project.team[0] || null : project.team,
        client: Array.isArray(project.client) ? project.client[0] || null : project.client,
        issues: issues || [],
        issue_stats: {
            total: totalIssues || 0,
            done: doneIssues || 0,
        },
    };
}

export async function getTeamById(id: string) {
    const supabase = await createClient();
    const { data: team, error } = await supabase
        .from("teams")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        console.error("Error fetching team:", error);
        return null;
    }

    // Fetch team members
    const { data: members } = await supabase
        .from("team_members")
        .select(`
            id,
            role,
            profile:profiles (id, full_name, email, avatar_url)
        `)
        .eq("team_id", id);

    // Fetch team projects
    const { data: projects } = await supabase
        .from("projects")
        .select(`
            id,
            name,
            status,
            lead:profiles!projects_lead_id_fkey (id, full_name)
        `)
        .eq("team_id", id)
        .order("created_at", { ascending: false });

    return {
        ...team,
        members: (members || []).map((m: { profile: unknown[] | unknown }) => ({
            ...m,
            profile: Array.isArray(m.profile) ? m.profile[0] || null : m.profile,
        })),
        projects: (projects || []).map((p: { lead: unknown[] | unknown }) => ({
            ...p,
            lead: Array.isArray(p.lead) ? p.lead[0] || null : p.lead,
        })),
    };
}

// ============ UPDATE ACTIONS ============

export async function updateIssue(formData: FormData): Promise<ActionResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const id = formData.get("id") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const status = formData.get("status") as string;
    const priority = formData.get("priority") as string;
    const teamId = formData.get("team_id") as string | null;
    const projectId = formData.get("project_id") as string | null;

    if (!id) {
        return { success: false, error: "Issue ID is required" };
    }

    if (!title?.trim()) {
        return { success: false, error: "Title is required" };
    }

    const { data, error } = await supabase
        .from("issues")
        .update({
            title: title.trim(),
            description: description?.trim() || null,
            status,
            priority,
            team_id: teamId || null,
            project_id: projectId || null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("Error updating issue:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/issues/${id}`);
    revalidatePath("/issues");
    return { success: true, data };
}

export async function updateProject(formData: FormData): Promise<ActionResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string | null;
    const projectGroup = formData.get("project_group") as string | null;
    const leadId = formData.get("lead_id") as string | null;
    const teamId = formData.get("team_id") as string | null;
    const targetDate = formData.get("target_date") as string | null;

    if (!id) {
        return { success: false, error: "Project ID is required" };
    }

    if (!name?.trim()) {
        return { success: false, error: "Project name is required" };
    }

    const { data, error } = await supabase
        .from("projects")
        .update({
            name: name.trim(),
            description: description?.trim() || null,
            project_group: projectGroup || null,
            lead_id: leadId || null,
            team_id: teamId || null,
            target_date: targetDate || null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("Error updating project:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/projects/${id}`);
    revalidatePath("/projects");
    return { success: true, data };
}

// ============ DELETE ACTIONS ============

export async function deleteIssue(id: string): Promise<ActionResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
        .from("issues")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting issue:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/issues");
    return { success: true };
}

export async function deleteProject(id: string): Promise<ActionResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting project:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/projects");
    return { success: true };
}

// ============ COMMENT ACTIONS ============

export async function createComment(formData: FormData): Promise<ActionResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const issueId = formData.get("issue_id") as string;
    const body = formData.get("body") as string;

    if (!issueId) {
        return { success: false, error: "Issue ID is required" };
    }

    if (!body?.trim()) {
        return { success: false, error: "Comment body is required" };
    }

    const { data, error } = await supabase
        .from("comments")
        .insert({
            issue_id: issueId,
            body: body.trim(),
            user_id: user.id,
        })
        .select(`
            id,
            body,
            created_at,
            user:profiles (id, full_name, email, avatar_url)
        `)
        .single();

    if (error) {
        console.error("Error creating comment:", error);
        return { success: false, error: error.message };
    }

    // Get the issue to find its team/project for activity visibility
    const { data: issue } = await supabase
        .from("issues")
        .select("team_id, project_id, title")
        .eq("id", issueId)
        .single();

    // Record activity
    await createActivity(
        supabase,
        user.id,
        'comment_added',
        {
            comment_id: data.id,
            issue_id: issueId,
            team_id: issue?.team_id,
            project_id: issue?.project_id,
        },
        { issue_title: issue?.title }
    );

    revalidatePath(`/issues/${issueId}`);
    revalidatePath("/");
    return { success: true, data };
}

// ============ CLIENT ACTIONS ============

export type LeadStatus = 'dropped' | 'cold' | 'hot' | 'active_client' | 'inactive_client';

export async function createClientRecord(formData: FormData): Promise<ActionResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const displayName = formData.get("display_name") as string;
    const phone = formData.get("phone") as string | null;
    const website = formData.get("website") as string | null;
    const billingAddress = formData.get("billing_address") as string | null;
    const leadStatus = formData.get("lead_status") as LeadStatus || 'cold';
    const notes = formData.get("notes") as string | null;
    const workspaceId = formData.get("workspace_id") as string | null;

    if (!displayName?.trim()) {
        return { success: false, error: "Client name is required" };
    }

    // Get workspace ID from form or from user's default
    let wsId = workspaceId;
    if (!wsId) {
        wsId = await getCurrentWorkspaceId();
    }

    if (!wsId) {
        return { success: false, error: "Workspace is required" };
    }

    const { data, error } = await supabase
        .from("clients")
        .insert({
            display_name: displayName.trim(),
            phone: phone?.trim() || null,
            website: website?.trim() || null,
            billing_address: billingAddress?.trim() || null,
            lead_status: leadStatus,
            notes: notes?.trim() || null,
            workspace_id: wsId,
            created_by: user.id,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating client:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/clients");
    return { success: true, data };
}

export async function updateClientRecord(formData: FormData): Promise<ActionResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const id = formData.get("id") as string;
    const displayName = formData.get("display_name") as string;
    const phone = formData.get("phone") as string | null;
    const website = formData.get("website") as string | null;
    const billingAddress = formData.get("billing_address") as string | null;
    const leadStatus = formData.get("lead_status") as LeadStatus;
    const notes = formData.get("notes") as string | null;

    if (!id) {
        return { success: false, error: "Client ID is required" };
    }

    if (!displayName?.trim()) {
        return { success: false, error: "Client name is required" };
    }

    const { data, error } = await supabase
        .from("clients")
        .update({
            display_name: displayName.trim(),
            phone: phone?.trim() || null,
            website: website?.trim() || null,
            billing_address: billingAddress?.trim() || null,
            lead_status: leadStatus,
            notes: notes?.trim() || null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("Error updating client:", error);
        return { success: false, error: error.message };
    }

    // Log status change activity if status changed
    const { data: oldClient } = await supabase
        .from("clients")
        .select("lead_status")
        .eq("id", id)
        .single();

    if (oldClient && oldClient.lead_status !== leadStatus) {
        await supabase
            .from("client_activities")
            .insert({
                client_id: id,
                type: 'status_change',
                description: `Status changed from ${oldClient.lead_status} to ${leadStatus}`,
                metadata: { old_status: oldClient.lead_status, new_status: leadStatus },
                created_by: user.id,
            });
    }

    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return { success: true, data };
}

export async function deleteClientRecord(id: string): Promise<ActionResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting client:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/clients");
    return { success: true };
}

export async function getClients(workspaceId?: string | null, leadStatus?: LeadStatus | null) {
    const supabase = await createClient();

    // Get workspace ID from parameter or user's default
    let wsId = workspaceId;
    if (!wsId) {
        wsId = await getCurrentWorkspaceId();
    }

    let query = supabase
        .from("clients")
        .select(`
            id,
            display_name,
            phone,
            website,
            billing_address,
            lead_status,
            notes,
            last_contacted_at,
            created_at,
            creator:profiles!clients_created_by_fkey (id, full_name, email),
            assigned:profiles!clients_assigned_to_fkey (id, full_name, email)
        `)
        .order("created_at", { ascending: false });

    if (wsId) {
        query = query.eq("workspace_id", wsId);
    }

    if (leadStatus) {
        query = query.eq("lead_status", leadStatus);
    }

    const { data: clients, error } = await query;

    if (error) {
        console.error("Error fetching clients:", error);
        return [];
    }

    return (clients || []).map(client => ({
        ...client,
        creator: Array.isArray(client.creator) ? client.creator[0] || null : client.creator,
        assigned: Array.isArray(client.assigned) ? client.assigned[0] || null : client.assigned,
    }));
}

export async function getClientById(id: string) {
    const supabase = await createClient();

    const { data: client, error } = await supabase
        .from("clients")
        .select(`
            *,
            creator:profiles!clients_created_by_fkey (id, full_name, email),
            assigned:profiles!clients_assigned_to_fkey (id, full_name, email),
            contacts:client_contacts (
                id,
                name,
                email,
                phone,
                position,
                is_primary
            ),
            activities:client_activities (
                id,
                type,
                description,
                metadata,
                created_at,
                created_by:profiles (id, full_name, email)
            )
        `)
        .eq("id", id)
        .single();

    if (error) {
        console.error("Error fetching client:", error);
        return null;
    }

    return {
        ...client,
        creator: Array.isArray(client.creator) ? client.creator[0] || null : client.creator,
        assigned: Array.isArray(client.assigned) ? client.assigned[0] || null : client.assigned,
        activities: (client.activities || []).map((a: any) => ({
            ...a,
            created_by: Array.isArray(a.created_by) ? a.created_by[0] || null : a.created_by,
        })),
    };
}

export async function logClientActivity(
    clientId: string,
    type: 'call' | 'email' | 'meeting' | 'note' | 'status_change',
    description: string,
    metadata?: Record<string, any>
): Promise<ActionResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
        .from("client_activities")
        .insert({
            client_id: clientId,
            type,
            description,
            metadata: metadata || {},
            created_by: user.id,
        })
        .select()
        .single();

    if (error) {
        console.error("Error logging client activity:", error);
        return { success: false, error: error.message };
    }

    // Update last_contacted_at if it's a contact activity
    if (['call', 'email', 'meeting'].includes(type)) {
        await supabase
            .from("clients")
            .update({ last_contacted_at: new Date().toISOString() })
            .eq("id", clientId);
    }

    revalidatePath(`/clients/${clientId}`);
    return { success: true, data };
}

// ============ MEETING ACTIONS ============

export async function createMeeting(formData: FormData): Promise<ActionResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const startTime = formData.get("start_time") as string;
    const endTime = formData.get("end_time") as string;
    const projectId = formData.get("project_id") as string | null;
    const clientId = formData.get("client_id") as string | null; // New field for client association
    const workspaceId = formData.get("workspace_id") as string | null;

    if (!title?.trim()) {
        return { success: false, error: "Title is required" };
    }
    if (!startTime) {
        return { success: false, error: "Start time is required" };
    }
    if (!endTime) {
        return { success: false, error: "End time is required" };
    }

    // Get workspace ID from form or from user's default
    let wsId = workspaceId;
    if (!wsId) {
        wsId = await getCurrentWorkspaceId();
    }

    const { data, error } = await supabase
        .from("meetings")
        .insert({
            title: title.trim(),
            description: description?.trim() || null,
            start_time: startTime,
            end_time: endTime,
            project_id: projectId || null,
            client_id: clientId || null, // Include client_id in insert
            created_by: user.id,
            workspace_id: wsId,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating meeting:", error);
        return { success: false, error: error.message };
    }

    // Log client activity if meeting is with a client
    if (clientId) {
        await logClientActivity(
            clientId,
            'meeting',
            `Meeting scheduled: ${title}`,
            { meeting_id: data.id, start_time: startTime, end_time: endTime }
        );
    }

    // Record activity for dashboard feed
    await createActivity(
        supabase,
        user.id,
        'meeting_created',
        {
            meeting_id: data.id,
            project_id: projectId,
            workspace_id: wsId,
        },
        { title: title.trim(), start_time: startTime, end_time: endTime }
    );

    revalidatePath("/schedule");
    revalidatePath("/"); // Also revalidate dashboard to show new activity
    return { success: true, data };
}

export async function deleteMeeting(meetingId: string): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
        .from("meetings")
        .delete()
        .eq("id", meetingId);

    if (error) {
        console.error("Error deleting meeting:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/schedule");
    return { success: true };
}

export async function getMeetings(workspaceId?: string | null) {
    const supabase = await createClient();

    // Get workspace ID from parameter or user's default
    let wsId = workspaceId;
    if (!wsId) {
        wsId = await getCurrentWorkspaceId();
    }

    let query = supabase
        .from("meetings")
        .select(`
            id,
            title,
            description,
            start_time,
            end_time,
            created_at,
            project:projects (id, name),
            client:clients (id, display_name, lead_status),
            creator:profiles!meetings_created_by_fkey (id, full_name, email),
            attendees:meeting_attendees (
                id,
                profile:profiles (id, full_name, email, avatar_url)
            )
        `)
        .order("start_time", { ascending: true });

    if (wsId) {
        query = query.eq("workspace_id", wsId);
    }

    const { data: meetings, error } = await query;

    if (error) {
        console.error("Error fetching meetings:", error);
        return [];
    }

    return (meetings || []).map(meeting => ({
        ...meeting,
        project: Array.isArray(meeting.project) ? meeting.project[0] || null : meeting.project,
        client: Array.isArray((meeting as any).client) ? (meeting as any).client[0] || null : (meeting as any).client,
        creator: Array.isArray(meeting.creator) ? meeting.creator[0] || null : meeting.creator,
        attendees: (meeting.attendees || []).map((a: { profile: unknown[] | unknown }) => ({
            ...a,
            profile: Array.isArray(a.profile) ? a.profile[0] || null : a.profile,
        })),
    }));
}

// ============ ACTIVITY ACTIONS ============

export type Activity = {
    id: string;
    type: ActivityType;
    created_at: string;
    metadata: Record<string, unknown>;
    actor: {
        id: string;
        full_name: string | null;
        email: string | null;
        avatar_url: string | null;
    } | null;
    project: { id: string; name: string } | null;
    issue: { id: string; title: string } | null;
    team: { id: string; name: string; key: string } | null;
    meeting: { id: string; title: string; start_time: string } | null;
};

export async function getRecentActivities(limit: number = 20, workspaceId?: string | null): Promise<Activity[]> {
    const supabase = await createClient();

    // Get workspace ID from parameter or user's default
    let wsId = workspaceId;
    if (!wsId) {
        wsId = await getCurrentWorkspaceId();
    }

    let query = supabase
        .from("activities")
        .select(`
            id,
            type,
            created_at,
            metadata,
            actor:profiles!activities_actor_id_fkey (id, full_name, email, avatar_url),
            project:projects (id, name),
            issue:issues (id, title),
            team:teams (id, name, key),
            meeting:meetings (id, title, start_time)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (wsId) {
        query = query.eq("workspace_id", wsId);
    }

    const { data: activities, error } = await query;

    if (error) {
        console.error("Error fetching activities:", error);
        return [];
    }

    // Normalize the response (arrays to single objects)
    return (activities || []).map((a) => ({
        ...a,
        actor: Array.isArray(a.actor) ? a.actor[0] || null : a.actor,
        project: Array.isArray(a.project) ? a.project[0] || null : a.project,
        issue: Array.isArray(a.issue) ? a.issue[0] || null : a.issue,
        team: Array.isArray(a.team) ? a.team[0] || null : a.team,
        meeting: Array.isArray(a.meeting) ? a.meeting[0] || null : a.meeting,
    })) as Activity[];
}

// ============ MEETING ATTENDEE ACTIONS ============

export async function addMeetingAttendee(meetingId: string, profileId: string): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
        .from("meeting_attendees")
        .insert({
            meeting_id: meetingId,
            profile_id: profileId,
        })
        .select()
        .single();

    if (error) {
        console.error("Error adding meeting attendee:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/schedule");
    return { success: true, data };
}

export async function removeMeetingAttendee(meetingId: string, profileId: string): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
        .from("meeting_attendees")
        .delete()
        .eq("meeting_id", meetingId)
        .eq("profile_id", profileId);

    if (error) {
        console.error("Error removing meeting attendee:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/schedule");
    return { success: true };
}

export async function updateMeetingAttendeeStatus(
    meetingId: string,
    profileId: string,
    status: 'pending' | 'accepted' | 'declined' | 'tentative'
): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
        .from("meeting_attendees")
        .update({ status })
        .eq("meeting_id", meetingId)
        .eq("profile_id", profileId);

    if (error) {
        console.error("Error updating attendee status:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/schedule");
    return { success: true };
}

// ============ ISSUE ASSIGNEE ACTIONS ============

export async function addIssueAssignee(issueId: string, profileId: string): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
        .from("issue_assignees")
        .insert({
            issue_id: issueId,
            profile_id: profileId,
            assigned_by: user.id,
        })
        .select()
        .single();

    if (error) {
        console.error("Error adding issue assignee:", error);
        return { success: false, error: error.message };
    }

    // Get issue details for activity
    const { data: issue } = await supabase
        .from("issues")
        .select("team_id, project_id, title, workspace_id")
        .eq("id", issueId)
        .single();

    // Get assignee name for activity
    const { data: assignee } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", profileId)
        .single();

    // Record activity
    await createActivity(
        supabase,
        user.id,
        'issue_assigned' as ActivityType,
        {
            issue_id: issueId,
            team_id: issue?.team_id,
            project_id: issue?.project_id,
            workspace_id: issue?.workspace_id,
        },
        {
            issue_title: issue?.title,
            assignee_name: assignee?.full_name || assignee?.email,
        }
    );

    revalidatePath(`/issues/${issueId}`);
    revalidatePath("/issues");
    return { success: true, data };
}

export async function removeIssueAssignee(issueId: string, profileId: string): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
        .from("issue_assignees")
        .delete()
        .eq("issue_id", issueId)
        .eq("profile_id", profileId);

    if (error) {
        console.error("Error removing issue assignee:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/issues/${issueId}`);
    revalidatePath("/issues");
    return { success: true };
}

export async function getIssueAssignees(issueId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("issue_assignees")
        .select(`
            id,
            assigned_at,
            profile:profiles (id, full_name, email, avatar_url),
            assigned_by_profile:profiles!issue_assignees_assigned_by_fkey (id, full_name)
        `)
        .eq("issue_id", issueId);

    if (error) {
        console.error("Error fetching issue assignees:", error);
        return [];
    }

    return (data || []).map(a => ({
        ...a,
        profile: Array.isArray(a.profile) ? a.profile[0] || null : a.profile,
        assigned_by_profile: Array.isArray(a.assigned_by_profile) ? a.assigned_by_profile[0] || null : a.assigned_by_profile,
    }));
}
