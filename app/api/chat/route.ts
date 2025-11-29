import { google } from '@ai-sdk/google';
import { streamText, tool, stepCountIs } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Reference to prevent tree-shaking
void tool;
void stepCountIs;

export const maxDuration = 60;

async function getUserInfo() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', user.id)
    .single();

  return profile;
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const supabase = await createClient();

    const user = await getUserInfo();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Please sign in to use the AI assistant' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userName = user.full_name || user.email?.split('@')[0] || 'User';
    const isAdmin = user.role === 'admin';

    const systemPrompt = `You are Qualia AI, an intelligent assistant for the Qualia project management platform.

Current User: ${userName} (${user.email}) - ${isAdmin ? 'Administrator' : 'Team Member'}

You have tools to query the database for real-time information. Always use them to get current data before answering questions about projects, issues, or teams.

Guidelines:
- Use tools to get current data - don't guess
- Be concise and helpful
- Format lists clearly
- Reference items by name when discussing them`;

    const result = streamText({
      model: google('gemini-2.0-flash'),
      messages,
      system: systemPrompt,
      tools: {
        getDashboardStats: tool({
          description: 'Get statistics: project counts, issue counts by status, team counts',
          inputSchema: z.object({
            _placeholder: z.string().optional().describe('Not used'),
          }),
          execute: async () => {
            const [projects, issues, teams] = await Promise.all([
              supabase.from('projects').select('status'),
              supabase.from('issues').select('status, priority'),
              supabase.from('teams').select('id'),
            ]);

            const byStatus: Record<string, number> = {};
            const byPriority: Record<string, number> = {};
            issues.data?.forEach(i => {
              byStatus[i.status] = (byStatus[i.status] || 0) + 1;
              byPriority[i.priority] = (byPriority[i.priority] || 0) + 1;
            });

            return {
              projects: projects.data?.length || 0,
              issues: { total: issues.data?.length || 0, byStatus, byPriority },
              teams: teams.data?.length || 0,
            };
          },
        }),

        searchIssues: tool({
          description: 'Search/list issues with optional filters',
          inputSchema: z.object({
            query: z.string().optional().describe('Search in title'),
            status: z.string().optional().describe('Filter by status'),
            priority: z.string().optional().describe('Filter by priority'),
            limit: z.number().optional().describe('Max results (default 10)'),
          }),
          execute: async ({ query, status, priority, limit = 10 }) => {
            let q = supabase
              .from('issues')
              .select(`id, title, status, priority, created_at,
                creator:profiles!issues_creator_id_fkey(full_name),
                project:projects(name), team:teams(name)`)
              .order('created_at', { ascending: false })
              .limit(limit);

            if (query) q = q.ilike('title', `%${query}%`);
            if (status) q = q.eq('status', status);
            if (priority) q = q.eq('priority', priority);

            const { data, error } = await q;
            if (error) return { error: error.message };

            return {
              count: data?.length || 0,
              issues: data?.map(i => ({
                id: i.id,
                title: i.title,
                status: i.status,
                priority: i.priority,
                creator: Array.isArray(i.creator) ? i.creator[0]?.full_name : null,
                project: Array.isArray(i.project) ? i.project[0]?.name : null,
                team: Array.isArray(i.team) ? i.team[0]?.name : null,
              })) || [],
            };
          },
        }),

        searchProjects: tool({
          description: 'Search/list projects with optional status filter',
          inputSchema: z.object({
            query: z.string().optional().describe('Search in name'),
            status: z.string().optional().describe('Filter by status'),
            limit: z.number().optional().describe('Max results (default 10)'),
          }),
          execute: async ({ query, status, limit = 10 }) => {
            let q = supabase
              .from('projects')
              .select(`id, name, status, target_date,
                lead:profiles!projects_lead_id_fkey(full_name),
                team:teams(name)`)
              .order('created_at', { ascending: false })
              .limit(limit);

            if (query) q = q.ilike('name', `%${query}%`);
            if (status) q = q.eq('status', status);

            const { data, error } = await q;
            if (error) return { error: error.message };

            return {
              count: data?.length || 0,
              projects: data?.map(p => ({
                id: p.id,
                name: p.name,
                status: p.status,
                target_date: p.target_date,
                lead: Array.isArray(p.lead) ? p.lead[0]?.full_name : null,
                team: Array.isArray(p.team) ? p.team[0]?.name : null,
              })) || [],
            };
          },
        }),

        getTeams: tool({
          description: 'Get all teams',
          inputSchema: z.object({
            _placeholder: z.string().optional().describe('Not used'),
          }),
          execute: async () => {
            const { data, error } = await supabase
              .from('teams')
              .select('id, name, key, description')
              .order('name');

            if (error) return { error: error.message };
            return { count: data?.length || 0, teams: data || [] };
          },
        }),

        getRecentActivity: tool({
          description: 'Get recent activity feed',
          inputSchema: z.object({
            limit: z.number().optional().describe('Number of activities (default 10)'),
          }),
          execute: async ({ limit = 10 }) => {
            const { data, error } = await supabase
              .from('activities')
              .select(`type, created_at, metadata,
                actor:profiles!activities_actor_id_fkey(full_name),
                project:projects(name), issue:issues(title), team:teams(name)`)
              .order('created_at', { ascending: false })
              .limit(limit);

            if (error) return { error: error.message };

            return {
              activities: data?.map(a => ({
                type: a.type,
                actor: Array.isArray(a.actor) ? a.actor[0]?.full_name : null,
                project: Array.isArray(a.project) ? a.project[0]?.name : null,
                issue: Array.isArray(a.issue) ? a.issue[0]?.title : null,
                team: Array.isArray(a.team) ? a.team[0]?.name : null,
                created_at: a.created_at,
              })) || [],
            };
          },
        }),
      },
      stopWhen: stepCountIs(5),
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
