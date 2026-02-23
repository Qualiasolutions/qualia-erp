/**
 * Read-only AI Tools
 * Used by both chat and voice interfaces
 */

import { tool } from 'ai';
import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';
import { embed } from 'ai';
import { geminiEmbeddingModel } from '../gemini-client';

/**
 * Create read-only tools for AI
 */
export function createReadTools(supabase: SupabaseClient, workspaceId: string | null) {
  return {
    getDashboardStats: tool({
      description: 'Get statistics: project counts, issue counts by status, team counts',
      inputSchema: z.object({
        _placeholder: z.string().optional().describe('Not used'),
      }),
      execute: async (): Promise<{
        projects: number;
        issues: {
          total: number;
          byStatus: Record<string, number>;
          byPriority: Record<string, number>;
        };
        teams: number;
      }> => {
        const [projects, issues, teams] = await Promise.all([
          supabase.from('projects').select('status').eq('workspace_id', workspaceId),
          supabase.from('issues').select('status, priority').eq('workspace_id', workspaceId),
          supabase.from('teams').select('id').eq('workspace_id', workspaceId),
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

    searchTasks: tool({
      description:
        'Search and list tasks with filters. Use when user asks "what are my tasks", "show tasks", "list todos", etc.',
      inputSchema: z.object({
        query: z.string().optional().describe('Search in title'),
        status: z
          .enum(['Todo', 'In Progress', 'Done', 'Canceled'])
          .optional()
          .describe('Filter by status'),
        priority: z
          .enum(['Urgent', 'High', 'Medium', 'Low', 'No Priority'])
          .optional()
          .describe('Filter by priority'),
        show_inbox_only: z.boolean().optional().describe('Show only inbox tasks (default: false)'),
        project_id: z.string().uuid().optional().describe('Filter by project'),
        limit: z.number().optional().describe('Max results (default 20)'),
      }),
      execute: async ({
        query,
        status,
        priority,
        show_inbox_only = false,
        project_id,
        limit = 20,
      }: {
        query?: string;
        status?: 'Todo' | 'In Progress' | 'Done' | 'Canceled';
        priority?: 'Urgent' | 'High' | 'Medium' | 'Low' | 'No Priority';
        show_inbox_only?: boolean;
        project_id?: string;
        limit?: number;
      }) => {
        let q = supabase
          .from('tasks')
          .select(
            `id, title, status, priority, due_date, created_at, show_in_inbox,
            assignee:profiles!tasks_assignee_id_fkey(full_name),
            project:projects(name)`
          )
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (query) q = q.ilike('title', `%${query}%`);
        if (status) q = q.eq('status', status);
        if (priority) q = q.eq('priority', priority);
        if (show_inbox_only) q = q.eq('show_in_inbox', true);
        if (project_id) q = q.eq('project_id', project_id);

        const { data, error } = await q;
        if (error) return { error: error.message };

        return {
          count: data?.length || 0,
          tasks:
            data?.map((t) => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
              dueDate: t.due_date,
              assignedTo: Array.isArray(t.assignee) ? t.assignee[0]?.full_name : null,
              project: Array.isArray(t.project) ? t.project[0]?.name : null,
              inInbox: t.show_in_inbox,
            })) || [],
        };
      },
    }),

    searchIssues: tool({
      description:
        'Search legacy issues (DEPRECATED - use searchTasks for new tasks). Only use if specifically asked about issues.',
      inputSchema: z.object({
        query: z.string().optional().describe('Search in title'),
        status: z.string().optional().describe('Filter by status'),
        priority: z.string().optional().describe('Filter by priority'),
        limit: z.number().optional().describe('Max results (default 10)'),
      }),
      execute: async ({
        query,
        status,
        priority,
        limit = 10,
      }: {
        query?: string;
        status?: string;
        priority?: string;
        limit?: number;
      }) => {
        let q = supabase
          .from('issues')
          .select(
            `id, title, status, priority, created_at,
            creator:profiles!issues_creator_id_fkey(full_name),
            project:projects(name), team:teams(name)`
          )
          .eq('workspace_id', workspaceId)
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
      execute: async ({
        query,
        status,
        limit = 10,
      }: {
        query?: string;
        status?: string;
        limit?: number;
      }) => {
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
          .eq('workspace_id', workspaceId)
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
      execute: async ({ limit = 10 }: { limit?: number }) => {
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
      description: 'Search clients by name, phone, or status. Use when user asks about clients.',
      inputSchema: z.object({
        query: z.string().optional().describe('Search in display name'),
        leadStatus: z
          .enum(['active_client', 'inactive_client', 'hot', 'cold', 'dropped'])
          .optional(),
        limit: z.number().optional().describe('Max results (default 10)'),
      }),
      execute: async ({
        query,
        leadStatus,
        limit = 10,
      }: {
        query?: string;
        leadStatus?: 'active_client' | 'inactive_client' | 'hot' | 'cold' | 'dropped';
        limit?: number;
      }) => {
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
      execute: async ({ days = 7, limit = 10 }: { days?: number; limit?: number }) => {
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
        'Get detailed project info including progress. Use when user asks about a specific project.',
      inputSchema: z.object({
        project_id: z.string().uuid().describe('Project ID'),
      }),
      execute: async ({ project_id }: { project_id: string }) => {
        const { data: project, error } = await supabase
          .from('projects')
          .select(
            `id, name, status, description, target_date, project_type, progress,
            lead:profiles!projects_lead_id_fkey(full_name),
            client:clients(display_name),
            team:teams(name)`
          )
          .eq('id', project_id)
          .single();

        if (error) return { error: error.message };

        // Get task statistics for this project
        const { data: tasks } = await supabase
          .from('tasks')
          .select('status')
          .eq('project_id', project_id);

        const taskStats = {
          total: tasks?.length || 0,
          done: tasks?.filter((t) => t.status === 'Done').length || 0,
          inProgress: tasks?.filter((t) => t.status === 'In Progress').length || 0,
          todo: tasks?.filter((t) => t.status === 'Todo').length || 0,
        };

        return {
          project: {
            id: project.id,
            name: project.name,
            status: project.status,
            description: project.description,
            targetDate: project.target_date,
            type: project.project_type,
            progress: project.progress || 0,
            lead: Array.isArray(project.lead) ? project.lead[0]?.full_name : null,
            client: Array.isArray(project.client) ? project.client[0]?.display_name : null,
            team: Array.isArray(project.team) ? project.team[0]?.name : null,
          },
          tasks: taskStats,
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

    searchKnowledgeBase: tool({
      description:
        'Search the company knowledge base using semantic similarity. Use when user asks about documentation, procedures, policies, or wants to find information from stored documents.',
      inputSchema: z.object({
        query: z.string().describe('The search query - what the user is looking for'),
        limit: z.number().optional().describe('Max results to return (default 5)'),
      }),
      execute: async ({ query, limit = 5 }: { query: string; limit?: number }) => {
        try {
          // Generate embedding for the query
          const { embedding } = await embed({
            model: geminiEmbeddingModel,
            value: query,
          });

          // Search using match_documents function
          const { data: documents, error } = await supabase.rpc('match_documents', {
            query_embedding: embedding,
            match_threshold: 0.7,
            match_count: limit,
            filter_workspace_id: workspaceId,
          });

          if (error) {
            console.error('Knowledge base search error:', error);
            return { error: 'Search failed', results: [] };
          }

          if (!documents || documents.length === 0) {
            return {
              message: 'No relevant documents found',
              results: [],
              query,
            };
          }

          return {
            query,
            count: documents.length,
            results: documents.map(
              (doc: {
                id: string;
                title: string;
                content: string;
                url: string | null;
                similarity: number;
              }) => ({
                id: doc.id,
                title: doc.title,
                content: doc.content.length > 500 ? doc.content.slice(0, 500) + '...' : doc.content,
                url: doc.url,
                relevance: Math.round(doc.similarity * 100) + '%',
              })
            ),
          };
        } catch (err) {
          console.error('Knowledge base search error:', err);
          return { error: 'Search failed', results: [] };
        }
      },
    }),

    getFinancialSummary: tool({
      description:
        'Get financial overview: total income, expenses, pending payments, client balances, monthly recurring. Use when user asks "how much are we owed", "financial summary", "money", "payments", "revenue", "expenses", "burn rate".',
      inputSchema: z.object({
        include_client_balances: z
          .boolean()
          .optional()
          .describe('Include per-client balance breakdown (default: true)'),
      }),
      execute: async ({
        include_client_balances = true,
      }: {
        include_client_balances?: boolean;
      }) => {
        // Get all payments
        const { data: payments } = await supabase
          .from('payments')
          .select('type, amount, status, payment_date, client_id')
          .eq('workspace_id', workspaceId);

        // Get recurring payments
        const { data: recurring } = await supabase
          .from('recurring_payments')
          .select('type, amount')
          .eq('workspace_id', workspaceId)
          .eq('is_active', true);

        // Calculate payment totals
        const summary = (payments || []).reduce(
          (acc, p) => {
            const amount = Number(p.amount);
            if (p.type === 'incoming') {
              acc.totalIncoming += amount;
              if (p.status === 'pending') acc.pendingIncoming += amount;
              if (p.status === 'completed') acc.completedIncoming += amount;
            } else {
              acc.totalOutgoing += amount;
              if (p.status === 'pending') acc.pendingOutgoing += amount;
              if (p.status === 'completed') acc.completedOutgoing += amount;
            }
            return acc;
          },
          {
            totalIncoming: 0,
            totalOutgoing: 0,
            pendingIncoming: 0,
            pendingOutgoing: 0,
            completedIncoming: 0,
            completedOutgoing: 0,
          }
        );

        // Calculate recurring totals
        const recurringSummary = (recurring || []).reduce(
          (acc, r) => {
            const amount = Number(r.amount);
            if (r.type === 'incoming') acc.monthlyIncome += amount;
            else acc.monthlyExpenses += amount;
            return acc;
          },
          { monthlyIncome: 0, monthlyExpenses: 0 }
        );

        const result: Record<string, unknown> = {
          payments: {
            ...summary,
            netProfit: summary.completedIncoming - summary.completedOutgoing,
          },
          recurring: {
            ...recurringSummary,
            netMonthly: recurringSummary.monthlyIncome - recurringSummary.monthlyExpenses,
          },
        };

        // Client balances
        if (include_client_balances) {
          const { data: clients } = await supabase
            .from('clients')
            .select('id, display_name')
            .eq('workspace_id', workspaceId);

          const clientBalances = (clients || [])
            .map((client) => {
              const clientPayments = (payments || []).filter((p) => p.client_id === client.id);
              const paid = clientPayments
                .filter((p) => p.type === 'incoming' && p.status === 'completed')
                .reduce((s, p) => s + Number(p.amount), 0);
              const pending = clientPayments
                .filter((p) => p.type === 'incoming' && p.status === 'pending')
                .reduce((s, p) => s + Number(p.amount), 0);
              return {
                name: client.display_name,
                paid,
                pending,
                total: paid + pending,
              };
            })
            .filter((c) => c.total > 0)
            .sort((a, b) => b.pending - a.pending);

          result.clientBalances = clientBalances;
        }

        return result;
      },
    }),

    getDailyBriefing: tool({
      description:
        'Get a comprehensive daily briefing: overdue tasks, today\'s meetings, urgent items, stale projects, recent activity. Use when user says "morning briefing", "what\'s happening today", "daily summary", "brief me", "what do I need to know".',
      inputSchema: z.object({
        _placeholder: z.string().optional().describe('Not used'),
      }),
      execute: async () => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const todayEnd = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59
        ).toISOString();
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

        const [
          overdueTasks,
          urgentTasks,
          todayMeetings,
          recentActivity,
          activeProjects,
          pendingPayments,
        ] = await Promise.all([
          // Overdue tasks (due before today, not done)
          supabase
            .from('tasks')
            .select(
              'id, title, due_date, priority, assignee:profiles!tasks_assignee_id_fkey(full_name), project:projects(name)'
            )
            .eq('workspace_id', workspaceId)
            .lt('due_date', todayStart)
            .not('status', 'in', '("Done","Canceled")')
            .order('due_date', { ascending: true })
            .limit(10),
          // Urgent/high priority open tasks
          supabase
            .from('tasks')
            .select(
              'id, title, status, due_date, assignee:profiles!tasks_assignee_id_fkey(full_name), project:projects(name)'
            )
            .eq('workspace_id', workspaceId)
            .in('priority', ['Urgent', 'High'])
            .not('status', 'in', '("Done","Canceled")')
            .order('created_at', { ascending: false })
            .limit(10),
          // Today's meetings
          supabase
            .from('meetings')
            .select(
              'id, title, start_time, end_time, client:clients(display_name), project:projects(name)'
            )
            .eq('workspace_id', workspaceId)
            .gte('start_time', todayStart)
            .lte('start_time', todayEnd)
            .order('start_time'),
          // Recent activity (last 3 days)
          supabase
            .from('activities')
            .select(
              'type, created_at, metadata, actor:profiles!activities_actor_id_fkey(full_name)'
            )
            .gte('created_at', threeDaysAgo)
            .order('created_at', { ascending: false })
            .limit(10),
          // Active projects with progress
          supabase
            .from('projects')
            .select('id, name, status, progress, target_date')
            .eq('workspace_id', workspaceId)
            .eq('status', 'Active')
            .order('target_date', { ascending: true }),
          // Pending incoming payments
          supabase
            .from('payments')
            .select('amount, description, client:clients(display_name)')
            .eq('workspace_id', workspaceId)
            .eq('type', 'incoming')
            .eq('status', 'pending'),
        ]);

        const totalPending = (pendingPayments.data || []).reduce((s, p) => s + Number(p.amount), 0);

        return {
          date: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
          overdueTasks: {
            count: overdueTasks.data?.length || 0,
            items: (overdueTasks.data || []).map((t) => ({
              title: t.title,
              dueDate: t.due_date,
              priority: t.priority,
              assignee: Array.isArray(t.assignee) ? t.assignee[0]?.full_name : null,
              project: Array.isArray(t.project) ? t.project[0]?.name : null,
            })),
          },
          urgentTasks: {
            count: urgentTasks.data?.length || 0,
            items: (urgentTasks.data || []).map((t) => ({
              title: t.title,
              status: t.status,
              dueDate: t.due_date,
              assignee: Array.isArray(t.assignee) ? t.assignee[0]?.full_name : null,
              project: Array.isArray(t.project) ? t.project[0]?.name : null,
            })),
          },
          todaysMeetings: {
            count: todayMeetings.data?.length || 0,
            items: (todayMeetings.data || []).map((m) => ({
              title: m.title,
              time: m.start_time,
              client: Array.isArray(m.client) ? m.client[0]?.display_name : null,
              project: Array.isArray(m.project) ? m.project[0]?.name : null,
            })),
          },
          activeProjects: {
            count: activeProjects.data?.length || 0,
            items: (activeProjects.data || []).map((p) => ({
              name: p.name,
              progress: p.progress || 0,
              targetDate: p.target_date,
            })),
          },
          pendingPayments: {
            totalAmount: totalPending,
            count: pendingPayments.data?.length || 0,
          },
          recentActivityCount: recentActivity.data?.length || 0,
        };
      },
    }),

    getProjectRoadmap: tool({
      description:
        'Get project roadmap with phases, their progress, and tasks. Use when user asks "show roadmap for X", "what phase is X in", "project phases", "milestone progress".',
      inputSchema: z.object({
        project_id: z.string().uuid().optional().describe('Project ID (if known)'),
        project_name: z
          .string()
          .optional()
          .describe('Project name to search for (if ID not known)'),
      }),
      execute: async ({
        project_id,
        project_name,
      }: {
        project_id?: string;
        project_name?: string;
      }) => {
        let targetProjectId = project_id;

        if (!targetProjectId && project_name) {
          const { data: projects } = await supabase
            .from('projects')
            .select('id, name')
            .eq('workspace_id', workspaceId)
            .ilike('name', `%${project_name}%`)
            .limit(5);

          if (!projects || projects.length === 0) {
            return { error: `No project found matching "${project_name}".` };
          }
          if (projects.length > 1) {
            return {
              error: `Multiple projects match. Be more specific.`,
              matches: projects.map((p) => ({ id: p.id, name: p.name })),
            };
          }
          targetProjectId = projects[0].id;
        }

        if (!targetProjectId) {
          return { error: 'Provide project_id or project_name' };
        }

        // Get project info
        const { data: project } = await supabase
          .from('projects')
          .select('id, name, status, progress, target_date, project_type')
          .eq('id', targetProjectId)
          .single();

        if (!project) return { error: 'Project not found' };

        // Get phases with their items
        const { data: phases } = await supabase
          .from('project_phases')
          .select(
            'id, name, status, is_locked, completed_at, sort_order, phase_items(id, title, status)'
          )
          .eq('project_id', targetProjectId)
          .order('sort_order', { ascending: true });

        const roadmap = (phases || []).map((phase) => {
          const items = phase.phase_items || [];
          const total = items.length;
          const completed = items.filter((i: { status: string }) => i.status === 'Done').length;
          return {
            name: phase.name,
            status: phase.status,
            isLocked: phase.is_locked,
            completedAt: phase.completed_at,
            progress: total > 0 ? Math.round((completed / total) * 100) : 0,
            tasks: { total, completed },
            items: items.map((i: { title: string; status: string }) => ({
              title: i.title,
              status: i.status,
            })),
          };
        });

        return {
          project: {
            name: project.name,
            status: project.status,
            progress: project.progress || 0,
            targetDate: project.target_date,
            type: project.project_type,
          },
          phases: roadmap,
          totalPhases: roadmap.length,
          completedPhases: roadmap.filter((p) => p.status === 'completed').length,
        };
      },
    }),

    getTeamMembers: tool({
      description:
        'Get all team members in the workspace. Use when user needs to assign tasks, asks "who is on the team", or needs to find someone by name.',
      inputSchema: z.object({
        _placeholder: z.string().optional().describe('Not used'),
      }),
      execute: async () => {
        const { data: members, error } = await supabase
          .from('workspace_members')
          .select(
            'profile:profiles!workspace_members_profile_id_fkey(id, full_name, email, role, avatar_url)'
          )
          .eq('workspace_id', workspaceId);

        if (error) return { error: error.message };

        return {
          count: members?.length || 0,
          members: (members || []).map((m) => {
            const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
            return {
              id: profile?.id,
              name: profile?.full_name,
              email: profile?.email,
              role: profile?.role,
            };
          }),
        };
      },
    }),
  };
}
