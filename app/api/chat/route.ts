import { google } from '@ai-sdk/google';
import { streamText, tool, stepCountIs, convertToModelMessages } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { chatRateLimiter } from '@/lib/rate-limit';
import { z } from 'zod';

// Reference to prevent tree-shaking
void tool;
void stepCountIs;

export const maxDuration = 60;

async function getUserInfo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
    const supabase = await createClient();

    const user = await getUserInfo();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Please sign in to use the AI assistant' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting: 20 requests per minute per user
    const rateLimitResult = chatRateLimiter(user.id);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    const { messages } = await req.json();

    const userName = user.full_name || user.email?.split('@')[0] || 'User';
    const isAdmin = user.role === 'admin';

    // Get user's default workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('profile_id', user.id)
      .eq('is_default', true)
      .single();

    const workspaceId = membership?.workspace_id;

    const systemPrompt = `You are Qualia AI, an intelligent assistant for the Qualia project management platform.

Current User: ${userName} (${user.email}) - ${isAdmin ? 'Administrator' : 'Team Member'}
Current Time: ${new Date().toISOString()}

You have comprehensive tools for managing projects, tasks, clients, and meetings:

READ Tools:
- getDashboardStats: Overview counts
- searchIssues: Find tasks with filters
- searchProjects: Find projects
- searchClients: Find clients by name or status
- getTeams: List teams
- getRecentActivity: Activity feed
- getUpcomingMeetings: Scheduled meetings
- getProjectDetails: Full project info with roadmap progress
- getWorkspaceStats: Comprehensive workspace statistics

WRITE Tools:
- createTask: Create new tasks (use when user says "create task", "add todo", "remind me to", etc.)
- updateTaskStatus: Change task status (use when user says "mark as done", "complete", "start working on")
- addComment: Comment on tasks
- createClient: Add new clients (use when user wants to add a client or lead)
- createMeeting: Schedule meetings (use when user wants to schedule or book a meeting)

ROADMAP Tools:
- updateRoadmap: Modify phase details
- addRoadmapItem: Add items to phases
- deleteRoadmapItem: Remove items
- deleteRoadmap: Clear entire roadmap

Guidelines:
- Use tools to get real-time data - don't guess
- Be proactive: offer to create tasks, meetings, or clients based on conversation
- Confirm actions and provide details
- For scheduling, ask for date/time if not specified
- Reference items by name for clarity
- Be concise and helpful
- When deleting a roadmap, ALWAYS ask for confirmation first unless the user explicitly says "force delete" or "I am sure".`;

    const result = streamText({
      model: google('gemini-2.0-flash'),
      messages: convertToModelMessages(messages),
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
            issues.data?.forEach((i) => {
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
              .select(
                `id, title, status, priority, created_at,
                creator:profiles!issues_creator_id_fkey(full_name),
                project:projects(name), team:teams(name)`
              )
              .order('created_at', { ascending: false })
              .limit(limit);

            if (query) q = q.ilike('title', `%${query}%`);
            if (status) q = q.eq('status', status);
            if (priority) q = q.eq('priority', priority);

            const { data, error } = await q;
            if (error) return { error: error.message };

            return {
              count: data?.length || 0,
              issues:
                data?.map((i) => ({
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
              .select(
                `id, name, status, target_date,
                lead:profiles!projects_lead_id_fkey(full_name),
                team:teams(name)`
              )
              .order('created_at', { ascending: false })
              .limit(limit);

            if (query) q = q.ilike('name', `%${query}%`);
            if (status) q = q.eq('status', status);

            const { data, error } = await q;
            if (error) return { error: error.message };

            return {
              count: data?.length || 0,
              projects:
                data?.map((p) => ({
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
              .select(
                `type, created_at, metadata,
                actor:profiles!activities_actor_id_fkey(full_name),
                project:projects(name), issue:issues(title), team:teams(name)`
              )
              .order('created_at', { ascending: false })
              .limit(limit);

            if (error) return { error: error.message };

            return {
              activities:
                data?.map((a) => ({
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

        searchClients: tool({
          description:
            'Search clients by name, phone, or status. Use when user asks about clients.',
          inputSchema: z.object({
            query: z.string().optional().describe('Search in display name'),
            leadStatus: z
              .enum(['active_client', 'inactive_client', 'hot', 'cold', 'dropped'])
              .optional(),
            limit: z.number().optional().describe('Max results (default 10)'),
          }),
          execute: async ({ query, leadStatus, limit = 10 }) => {
            let q = supabase
              .from('clients')
              .select(
                `id, display_name, phone, website, lead_status, last_contacted_at,
                assigned:profiles!clients_assigned_to_fkey(full_name)`
              )
              .eq('workspace_id', workspaceId)
              .order('display_name')
              .limit(limit);

            if (query) q = q.ilike('display_name', `%${query}%`);
            if (leadStatus) q = q.eq('lead_status', leadStatus);

            const { data, error } = await q;
            if (error) return { error: error.message };

            return {
              count: data?.length || 0,
              clients:
                data?.map((c) => ({
                  id: c.id,
                  name: c.display_name,
                  phone: c.phone,
                  status: c.lead_status,
                  lastContacted: c.last_contacted_at,
                  assignedTo: Array.isArray(c.assigned) ? c.assigned[0]?.full_name : null,
                })) || [],
            };
          },
        }),

        getUpcomingMeetings: tool({
          description: 'Get upcoming meetings. Use when user asks about schedule or meetings.',
          inputSchema: z.object({
            days: z.number().optional().describe('Number of days ahead (default 7)'),
            limit: z.number().optional().describe('Max results (default 10)'),
          }),
          execute: async ({ days = 7, limit = 10 }) => {
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + days);

            const { data, error } = await supabase
              .from('meetings')
              .select(
                `id, title, start_time, end_time,
                client:clients(display_name),
                project:projects(name)`
              )
              .eq('workspace_id', workspaceId)
              .gte('start_time', new Date().toISOString())
              .lte('start_time', endDate.toISOString())
              .order('start_time')
              .limit(limit);

            if (error) return { error: error.message };

            return {
              count: data?.length || 0,
              meetings:
                data?.map((m) => ({
                  id: m.id,
                  title: m.title,
                  startTime: m.start_time,
                  endTime: m.end_time,
                  client: Array.isArray(m.client) ? m.client[0]?.display_name : null,
                  project: Array.isArray(m.project) ? m.project[0]?.name : null,
                })) || [],
            };
          },
        }),

        getProjectDetails: tool({
          description:
            'Get detailed project info including roadmap progress. Use when user asks about a specific project.',
          inputSchema: z.object({
            project_id: z.string().uuid().describe('Project ID'),
          }),
          execute: async ({ project_id }) => {
            const { data: project, error } = await supabase
              .from('projects')
              .select(
                `id, name, status, description, target_date, project_type,
                lead:profiles!projects_lead_id_fkey(full_name),
                client:clients(display_name),
                team:teams(name)`
              )
              .eq('id', project_id)
              .single();

            if (error) return { error: error.message };

            // Get roadmap progress
            const { data: phases } = await supabase
              .from('project_phases')
              .select('id, name, status, phase_items(is_completed)')
              .eq('project_id', project_id);

            let totalItems = 0;
            let completedItems = 0;
            phases?.forEach((p) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (p.phase_items as any[])?.forEach((item: { is_completed: boolean }) => {
                totalItems++;
                if (item.is_completed) completedItems++;
              });
            });

            return {
              project: {
                id: project.id,
                name: project.name,
                status: project.status,
                description: project.description,
                targetDate: project.target_date,
                type: project.project_type,
                lead: Array.isArray(project.lead) ? project.lead[0]?.full_name : null,
                client: Array.isArray(project.client) ? project.client[0]?.display_name : null,
                team: Array.isArray(project.team) ? project.team[0]?.name : null,
              },
              roadmap: {
                progress: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
                phasesCount: phases?.length || 0,
                completedItems,
                totalItems,
              },
            };
          },
        }),

        getWorkspaceStats: tool({
          description:
            'Get comprehensive workspace statistics. Use when user asks for overview or summary.',
          inputSchema: z.object({
            _placeholder: z.string().optional(),
          }),
          execute: async () => {
            const [projects, issues, clients, meetings] = await Promise.all([
              supabase.from('projects').select('status').eq('workspace_id', workspaceId),
              supabase.from('issues').select('status, priority').eq('workspace_id', workspaceId),
              supabase.from('clients').select('lead_status').eq('workspace_id', workspaceId),
              supabase
                .from('meetings')
                .select('id')
                .eq('workspace_id', workspaceId)
                .gte('start_time', new Date().toISOString()),
            ]);

            const projectsByStatus: Record<string, number> = {};
            projects.data?.forEach((p) => {
              projectsByStatus[p.status] = (projectsByStatus[p.status] || 0) + 1;
            });

            const issuesByStatus: Record<string, number> = {};
            issues.data?.forEach((i) => {
              issuesByStatus[i.status] = (issuesByStatus[i.status] || 0) + 1;
            });

            const activeClients =
              clients.data?.filter((c) => c.lead_status === 'active_client').length || 0;

            return {
              projects: {
                total: projects.data?.length || 0,
                byStatus: projectsByStatus,
              },
              issues: {
                total: issues.data?.length || 0,
                byStatus: issuesByStatus,
                open: (issuesByStatus['Todo'] || 0) + (issuesByStatus['In Progress'] || 0),
              },
              clients: {
                total: clients.data?.length || 0,
                active: activeClients,
              },
              upcomingMeetings: meetings.data?.length || 0,
            };
          },
        }),

        // ============ WRITE TOOLS ============

        createTask: tool({
          description:
            'Create a new task/issue. Use when user says "create task", "add issue", "remind me to", "add todo", etc.',
          inputSchema: z.object({
            title: z.string().describe('Task title (required)'),
            description: z.string().optional().describe('Task description'),
            priority: z
              .enum(['Urgent', 'High', 'Medium', 'Low', 'No Priority'])
              .optional()
              .describe('Task priority'),
            project_id: z.string().uuid().optional().describe('Project ID to assign to'),
          }),
          execute: async ({ title, description, priority, project_id }) => {
            if (!workspaceId) {
              return { error: 'No workspace found for user' };
            }

            const { data, error } = await supabase
              .from('issues')
              .insert({
                title,
                description: description || null,
                priority: priority || 'No Priority',
                status: 'Todo',
                project_id: project_id || null,
                creator_id: user.id,
                workspace_id: workspaceId,
              })
              .select('id, title, status, priority')
              .single();

            if (error) return { error: error.message };

            // Log activity
            await supabase.from('activities').insert({
              actor_id: user.id,
              type: 'issue_created',
              issue_id: data.id,
              project_id: project_id || null,
              workspace_id: workspaceId,
              metadata: { title: data.title, priority: data.priority, created_by_ai: true },
            });

            return {
              success: true,
              task: {
                id: data.id,
                title: data.title,
                status: data.status,
                priority: data.priority,
              },
              message: `Created task: "${data.title}"`,
            };
          },
        }),

        updateTaskStatus: tool({
          description:
            'Update a task status. Use when user says "mark X as done", "complete task", "start working on", "cancel task"',
          inputSchema: z.object({
            issue_id: z.string().uuid().describe('The issue ID to update'),
            status: z
              .enum(['Yet to Start', 'Todo', 'In Progress', 'Done', 'Canceled'])
              .describe('New status'),
          }),
          execute: async ({ issue_id, status }) => {
            // Get current task info
            const { data: currentTask } = await supabase
              .from('issues')
              .select('title, status')
              .eq('id', issue_id)
              .single();

            if (!currentTask) {
              return { error: 'Task not found' };
            }

            const { error } = await supabase
              .from('issues')
              .update({ status, updated_at: new Date().toISOString() })
              .eq('id', issue_id);

            if (error) return { error: error.message };

            // Log activity if marked as done
            if (status === 'Done') {
              await supabase.from('activities').insert({
                actor_id: user.id,
                type: 'issue_completed',
                issue_id,
                workspace_id: workspaceId,
                metadata: { title: currentTask.title, updated_by_ai: true },
              });
            }

            return {
              success: true,
              message: `Updated "${currentTask.title}" from ${currentTask.status} to ${status}`,
            };
          },
        }),

        addComment: tool({
          description:
            'Add a comment to an issue. Use when user wants to note something on a task.',
          inputSchema: z.object({
            issue_id: z.string().uuid().describe('The issue to comment on'),
            body: z.string().describe('The comment text'),
          }),
          execute: async ({ issue_id, body }) => {
            // Get task title for confirmation
            const { data: task } = await supabase
              .from('issues')
              .select('title, workspace_id')
              .eq('id', issue_id)
              .single();

            if (!task) {
              return { error: 'Task not found' };
            }

            const { data, error } = await supabase
              .from('comments')
              .insert({ issue_id, body, user_id: user.id })
              .select('id')
              .single();

            if (error) return { error: error.message };

            // Log activity
            await supabase.from('activities').insert({
              actor_id: user.id,
              type: 'comment_added',
              comment_id: data.id,
              issue_id,
              workspace_id: task.workspace_id,
              metadata: { issue_title: task.title, added_by_ai: true },
            });

            return {
              success: true,
              message: `Added comment to "${task.title}"`,
              commentId: data.id,
            };
          },
        }),

        createClient: tool({
          description: 'Create a new client. Use when user wants to add a new client or lead.',
          inputSchema: z.object({
            display_name: z.string().describe('Client/company name (required)'),
            phone: z.string().optional(),
            website: z.string().optional(),
            lead_status: z.enum(['active_client', 'inactive_client', 'hot', 'cold']).optional(),
            notes: z.string().optional(),
          }),
          execute: async ({ display_name, phone, website, lead_status, notes }) => {
            if (!workspaceId) {
              return { error: 'No workspace found for user' };
            }

            const { data, error } = await supabase
              .from('clients')
              .insert({
                display_name,
                phone: phone || null,
                website: website || null,
                lead_status: lead_status || 'hot',
                notes: notes || null,
                created_by: user.id,
                workspace_id: workspaceId,
              })
              .select('id, display_name, lead_status')
              .single();

            if (error) return { error: error.message };

            return {
              success: true,
              client: data,
              message: `Created client: "${data.display_name}"`,
            };
          },
        }),

        createMeeting: tool({
          description:
            'Schedule a new meeting. Use when user wants to create or schedule a meeting.',
          inputSchema: z.object({
            title: z.string().describe('Meeting title (required)'),
            start_time: z
              .string()
              .describe('ISO datetime string for start (e.g., 2025-01-15T10:00:00Z)'),
            end_time: z.string().optional().describe('ISO datetime string for end'),
            description: z.string().optional(),
            client_id: z.string().uuid().optional(),
            project_id: z.string().uuid().optional(),
          }),
          execute: async ({ title, start_time, end_time, description, client_id, project_id }) => {
            if (!workspaceId) {
              return { error: 'No workspace found for user' };
            }

            // Default end time to 1 hour after start
            const startDate = new Date(start_time);
            const defaultEnd =
              end_time || new Date(startDate.getTime() + 60 * 60 * 1000).toISOString();

            const { data, error } = await supabase
              .from('meetings')
              .insert({
                title,
                start_time,
                end_time: defaultEnd,
                description: description || null,
                client_id: client_id || null,
                project_id: project_id || null,
                created_by: user.id,
                workspace_id: workspaceId,
              })
              .select('id, title, start_time')
              .single();

            if (error) return { error: error.message };

            return {
              success: true,
              meeting: data,
              message: `Scheduled meeting: "${data.title}" for ${new Date(data.start_time).toLocaleString()}`,
            };
          },
        }),

        // ============ ROADMAP TOOLS ============

        updateRoadmap: tool({
          description: 'Update a roadmap phase details (name, description, status)',
          inputSchema: z.object({
            phase_id: z.string().uuid().describe('The phase ID to update'),
            name: z.string().optional(),
            description: z.string().optional(),
            status: z.enum(['not_started', 'in_progress', 'completed', 'skipped']).optional(),
          }),
          execute: async ({ phase_id, name, description, status }) => {
            const updates: Record<string, string | number | boolean | null> = {};
            if (name) updates.name = name;
            if (description) updates.description = description;
            if (status) updates.status = status;

            if (Object.keys(updates).length === 0) return { error: 'No updates provided' };

            const { error } = await supabase
              .from('project_phases')
              .update(updates)
              .eq('id', phase_id);

            if (error) return { error: error.message };
            return { success: true, message: 'Roadmap phase updated' };
          },
        }),

        deleteRoadmap: tool({
          description:
            'Delete an entire project roadmap (all phases and items). CAUTION: Irreversible.',
          inputSchema: z.object({
            project_id: z.string().uuid().describe('The project ID'),
          }),
          execute: async ({ project_id }) => {
            // First get phase IDs for this project
            const { data: phases, error: phasesQueryError } = await supabase
              .from('project_phases')
              .select('id')
              .eq('project_id', project_id);

            if (phasesQueryError) return { error: phasesQueryError.message };

            if (phases && phases.length > 0) {
              const phaseIds = phases.map((p) => p.id);

              // Delete all items for these phases
              const { error: itemsError } = await supabase
                .from('phase_items')
                .delete()
                .in('phase_id', phaseIds);

              if (itemsError) return { error: itemsError.message };
            }

            // Delete all phases for this project
            const { error } = await supabase
              .from('project_phases')
              .delete()
              .eq('project_id', project_id);

            if (error) return { error: error.message };
            return { success: true, message: 'Roadmap deleted successfully' };
          },
        }),

        addRoadmapItem: tool({
          description: 'Add an item to a roadmap phase',
          inputSchema: z.object({
            phase_id: z.string().uuid().describe('The phase ID'),
            title: z.string().describe('Item title'),
            description: z.string().optional(),
          }),
          execute: async ({ phase_id, title, description }) => {
            // Get max order
            const { data: maxOrder } = await supabase
              .from('phase_items')
              .select('display_order')
              .eq('phase_id', phase_id)
              .order('display_order', { ascending: false })
              .limit(1)
              .single();

            const nextOrder = (maxOrder?.display_order || 0) + 1;

            const { data, error } = await supabase
              .from('phase_items')
              .insert({
                phase_id,
                title,
                description,
                display_order: nextOrder,
                is_completed: false,
              })
              .select()
              .single();

            if (error) return { error: error.message };
            return { success: true, message: `Added item "${title}"`, item: data };
          },
        }),

        deleteRoadmapItem: tool({
          description: 'Delete a roadmap item',
          inputSchema: z.object({
            item_id: z.string().uuid().describe('The item ID'),
          }),
          execute: async ({ item_id }) => {
            const { error } = await supabase.from('phase_items').delete().eq('id', item_id);

            if (error) return { error: error.message };
            return { success: true, message: 'Roadmap item deleted' };
          },
        }),
      },
      stopWhen: stepCountIs(5),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process chat request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
