"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResult = {
    success: boolean;
    error?: string;
    data?: unknown;
};

export async function createIssue(formData: FormData): Promise<ActionResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const status = formData.get("status") as string || "Backlog";
    const priority = formData.get("priority") as string || "No Priority";
    const teamId = formData.get("team_id") as string | null;
    const projectId = formData.get("project_id") as string | null;

    if (!title?.trim()) {
        return { success: false, error: "Title is required" };
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
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating issue:", error);
        return { success: false, error: error.message };
    }

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

    if (!name?.trim()) {
        return { success: false, error: "Project name is required" };
    }

    if (!teamId) {
        return { success: false, error: "Team is required" };
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
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating project:", error);
        return { success: false, error: error.message };
    }

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

    if (!name?.trim()) {
        return { success: false, error: "Team name is required" };
    }

    if (!key?.trim()) {
        return { success: false, error: "Team key is required" };
    }

    const { data, error } = await supabase
        .from("teams")
        .insert({
            name: name.trim(),
            key: key.trim().toUpperCase(),
            description: description?.trim() || null,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating team:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/teams");
    return { success: true, data };
}

export async function getTeams() {
    const supabase = await createClient();
    const { data: teams } = await supabase
        .from("teams")
        .select("id, name, key")
        .order("name");
    return teams || [];
}

export async function getProjects() {
    const supabase = await createClient();
    const { data: projects } = await supabase
        .from("projects")
        .select("id, name")
        .order("name");
    return projects || [];
}
