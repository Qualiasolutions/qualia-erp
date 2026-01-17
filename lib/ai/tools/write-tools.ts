/**
 * Write AI Tools
 * Used by both chat and voice interfaces for mutations
 */

import { tool } from 'ai';
import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';

interface UserInfo {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

/**
 * Create write tools for AI
 */
export function createWriteTools(
  supabase: SupabaseClient,
  workspaceId: string | null,
  user: UserInfo
) {
  return {
    createTask: tool({
      description:
        'Create a new task. Use when user says "create task", "add task", "remind me to", "add todo", etc. This creates tasks in the modern tasks table.',
      inputSchema: z.object({
        title: z.string().describe('Task title (required)'),
        description: z.string().optional().describe('Task description'),
        priority: z
          .enum(['Urgent', 'High', 'Medium', 'Low', 'No Priority'])
          .optional()
          .describe('Task priority'),
        project_id: z.string().uuid().optional().describe('Project ID to assign to'),
        due_date: z.string().optional().describe('Due date (ISO format)'),
        show_in_inbox: z.boolean().optional().describe('Show in inbox (default: true)'),
      }),
      execute: async ({
        title,
        description,
        priority,
        project_id,
        due_date,
        show_in_inbox = true,
      }: {
        title: string;
        description?: string;
        priority?: 'Urgent' | 'High' | 'Medium' | 'Low' | 'No Priority';
        project_id?: string;
        due_date?: string;
        show_in_inbox?: boolean;
      }) => {
        if (!workspaceId) {
          return { error: 'No workspace found for user' };
        }

        // Validate project exists if provided
        if (project_id) {
          const { data: project } = await supabase
            .from('projects')
            .select('id, name')
            .eq('id', project_id)
            .eq('workspace_id', workspaceId)
            .single();

          if (!project) {
            return {
              error: `Project not found. Please verify the project ID or search for projects first.`,
            };
          }
        }

        const { data, error } = await supabase
          .from('tasks')
          .insert({
            title,
            description: description || null,
            priority: priority || 'No Priority',
            status: 'Todo',
            item_type: 'task',
            project_id: project_id || null,
            assigned_to: user.id,
            workspace_id: workspaceId,
            show_in_inbox,
            due_date: due_date || null,
          })
          .select('id, title, status, priority')
          .single();

        if (error) return { error: error.message };

        // Log activity
        await supabase.from('activities').insert({
          actor_id: user.id,
          type: 'task_created',
          task_id: data.id,
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
          message: `Created task: "${data.title}"${due_date ? ` (due: ${new Date(due_date).toLocaleDateString()})` : ''}`,
        };
      },
    }),

    updateTaskStatus: tool({
      description:
        'Update a task status. Use when user says "mark X as done", "complete task", "start working on", "cancel task". Works with both modern tasks and legacy issues.',
      inputSchema: z.object({
        task_id: z.string().uuid().describe('The task ID to update'),
        status: z.enum(['Todo', 'In Progress', 'Done', 'Canceled']).describe('New status'),
        task_name: z.string().optional().describe('Task name to search for (if ID not known)'),
      }),
      execute: async ({
        task_id,
        status,
        task_name,
      }: {
        task_id: string;
        status: 'Todo' | 'In Progress' | 'Done' | 'Canceled';
        task_name?: string;
      }) => {
        let targetTaskId = task_id;

        // If task_name provided, try to find the task
        if (task_name && !task_id) {
          const { data: tasks } = await supabase
            .from('tasks')
            .select('id, title')
            .eq('workspace_id', workspaceId)
            .ilike('title', `%${task_name}%`)
            .limit(5);

          if (!tasks || tasks.length === 0) {
            return {
              error: `No task found matching "${task_name}". Try searching for tasks first.`,
            };
          }

          if (tasks.length > 1) {
            return {
              error: `Multiple tasks match "${task_name}". Please be more specific.`,
              matches: tasks.map((t) => ({ id: t.id, title: t.title })),
            };
          }

          targetTaskId = tasks[0].id;
        }

        // Get current task info
        const { data: currentTask } = await supabase
          .from('tasks')
          .select('title, status, project_id')
          .eq('id', targetTaskId)
          .single();

        if (!currentTask) {
          return { error: 'Task not found' };
        }

        const { error } = await supabase
          .from('tasks')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', targetTaskId);

        if (error) return { error: error.message };

        // Log activity if marked as done
        if (status === 'Done') {
          await supabase.from('activities').insert({
            actor_id: user.id,
            type: 'task_completed',
            task_id: targetTaskId,
            project_id: currentTask.project_id,
            workspace_id: workspaceId,
            metadata: { title: currentTask.title, updated_by_ai: true },
          });
        }

        return {
          success: true,
          message: `Updated "${currentTask.title}" from ${currentTask.status} to ${status}`,
          task: {
            id: targetTaskId,
            title: currentTask.title,
            oldStatus: currentTask.status,
            newStatus: status,
          },
        };
      },
    }),

    addComment: tool({
      description: 'Add a comment to an issue. Use when user wants to note something on a task.',
      inputSchema: z.object({
        issue_id: z.string().uuid().describe('The issue to comment on'),
        body: z.string().describe('The comment text'),
      }),
      execute: async ({ issue_id, body }: { issue_id: string; body: string }) => {
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
      execute: async ({
        display_name,
        phone,
        website,
        lead_status,
        notes,
      }: {
        display_name: string;
        phone?: string;
        website?: string;
        lead_status?: 'active_client' | 'inactive_client' | 'hot' | 'cold';
        notes?: string;
      }) => {
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
      description: 'Schedule a new meeting. Use when user wants to create or schedule a meeting.',
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
      execute: async ({
        title,
        start_time,
        end_time,
        description,
        client_id,
        project_id,
      }: {
        title: string;
        start_time: string;
        end_time?: string;
        description?: string;
        client_id?: string;
        project_id?: string;
      }) => {
        if (!workspaceId) {
          return { error: 'No workspace found for user' };
        }

        // Validate client exists if provided
        if (client_id) {
          const { data: client } = await supabase
            .from('clients')
            .select('id, display_name')
            .eq('id', client_id)
            .eq('workspace_id', workspaceId)
            .single();

          if (!client) {
            return {
              error: `Client not found. Please verify the client ID or search for clients first.`,
            };
          }
        }

        // Validate project exists if provided
        if (project_id) {
          const { data: project } = await supabase
            .from('projects')
            .select('id, name')
            .eq('id', project_id)
            .eq('workspace_id', workspaceId)
            .single();

          if (!project) {
            return {
              error: `Project not found. Please verify the project ID or search for projects first.`,
            };
          }
        }

        // Default end time to 1 hour after start
        const startDate = new Date(start_time);
        const defaultEnd = end_time || new Date(startDate.getTime() + 60 * 60 * 1000).toISOString();

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

    createProject: tool({
      description:
        'Create a new project. Requires a team - use getTeams first to find available teams.',
      inputSchema: z.object({
        name: z.string().describe('Project name (required)'),
        description: z.string().optional().describe('Project description'),
        team_id: z.string().uuid().describe('Team ID (required) - use getTeams to find'),
        status: z
          .enum(['Demos', 'Active', 'Launched', 'Delayed', 'Archived', 'Canceled'])
          .default('Active')
          .describe('Project status'),
        target_date: z.string().optional().describe('Target completion date (ISO format)'),
        project_group: z.string().optional().describe('Project group/category'),
      }),
      execute: async ({
        name,
        description,
        team_id,
        status,
        target_date,
        project_group,
      }: {
        name: string;
        description?: string;
        team_id: string;
        status?: 'Demos' | 'Active' | 'Launched' | 'Delayed' | 'Archived' | 'Canceled';
        target_date?: string;
        project_group?: string;
      }) => {
        if (!workspaceId) {
          return { error: 'No workspace found for user' };
        }

        // Validate team exists
        const { data: team } = await supabase
          .from('teams')
          .select('id, name')
          .eq('id', team_id)
          .eq('workspace_id', workspaceId)
          .single();

        if (!team) {
          return {
            error: `Team not found. Use getTeams to find available teams.`,
          };
        }

        const { data, error } = await supabase
          .from('projects')
          .insert({
            name: name.trim(),
            description: description?.trim() || null,
            status: status || 'Active',
            team_id,
            lead_id: user.id,
            target_date: target_date || null,
            workspace_id: workspaceId,
            project_group: project_group || null,
          })
          .select('id, name, status')
          .single();

        if (error) return { error: error.message };

        return {
          success: true,
          project: data,
          message: `Created project: "${data.name}" with status ${data.status}`,
        };
      },
    }),

    updateProjectProgress: tool({
      description:
        'Update a project\'s progress percentage. Use when user says "set progress to X%", "mark project as X% complete", "update Anastasia project to 100%", etc. Can also search by project name.',
      inputSchema: z.object({
        project_id: z.string().uuid().optional().describe('Project ID (if known)'),
        project_name: z
          .string()
          .optional()
          .describe('Project name to search for (if ID not known)'),
        progress: z.number().min(0).max(100).describe('Progress percentage (0-100)'),
      }),
      execute: async ({
        project_id,
        project_name,
        progress,
      }: {
        project_id?: string;
        project_name?: string;
        progress: number;
      }) => {
        let targetProjectId = project_id;
        let projectInfo: { id: string; name: string; progress: number | null } | null = null;

        // If no project_id provided, search by name
        if (!targetProjectId && project_name) {
          const { data: projects } = await supabase
            .from('projects')
            .select('id, name, progress')
            .eq('workspace_id', workspaceId)
            .ilike('name', `%${project_name}%`)
            .limit(5);

          if (!projects || projects.length === 0) {
            return {
              error: `No project found matching "${project_name}". Try searching for projects first.`,
            };
          }

          if (projects.length > 1) {
            return {
              error: `Multiple projects match "${project_name}". Please be more specific or use the project ID.`,
              matches: projects.map((p) => ({ id: p.id, name: p.name })),
            };
          }

          targetProjectId = projects[0].id;
          projectInfo = projects[0];
        }

        if (!targetProjectId) {
          return { error: 'Please provide either project_id or project_name' };
        }

        // Get project info if we don't have it
        if (!projectInfo) {
          const { data } = await supabase
            .from('projects')
            .select('id, name, progress')
            .eq('id', targetProjectId)
            .single();
          projectInfo = data;
        }

        if (!projectInfo) {
          return { error: 'Project not found' };
        }

        const oldProgress = projectInfo.progress || 0;

        // Update the project progress
        const { error } = await supabase
          .from('projects')
          .update({
            progress,
            updated_at: new Date().toISOString(),
            // If progress is 100%, consider updating status to Launched
            ...(progress === 100 ? { status: 'Launched' } : {}),
          })
          .eq('id', targetProjectId);

        if (error) return { error: error.message };

        // Log activity
        await supabase.from('activities').insert({
          actor_id: user.id,
          type: 'project_updated',
          project_id: targetProjectId,
          workspace_id: workspaceId,
          metadata: {
            field: 'progress',
            old_value: oldProgress,
            new_value: progress,
            updated_by_ai: true,
          },
        });

        return {
          success: true,
          message: `Updated "${projectInfo.name}" progress: ${oldProgress}% -> ${progress}%${progress === 100 ? ' Project marked as Launched!' : ''}`,
          project: {
            id: targetProjectId,
            name: projectInfo.name,
            oldProgress,
            newProgress: progress,
          },
        };
      },
    }),

    updateProjectStatus: tool({
      description:
        'Update a project\'s status. Use when user says "mark project as active", "archive project", "launch project", etc.',
      inputSchema: z.object({
        project_id: z.string().uuid().optional().describe('Project ID (if known)'),
        project_name: z
          .string()
          .optional()
          .describe('Project name to search for (if ID not known)'),
        status: z
          .enum(['Demos', 'Active', 'Launched', 'Delayed', 'Archived', 'Canceled'])
          .describe('New project status'),
      }),
      execute: async ({
        project_id,
        project_name,
        status,
      }: {
        project_id?: string;
        project_name?: string;
        status: 'Demos' | 'Active' | 'Launched' | 'Delayed' | 'Archived' | 'Canceled';
      }) => {
        let targetProjectId = project_id;
        let projectInfo: { id: string; name: string; status: string } | null = null;

        // If no project_id provided, search by name
        if (!targetProjectId && project_name) {
          const { data: projects } = await supabase
            .from('projects')
            .select('id, name, status')
            .eq('workspace_id', workspaceId)
            .ilike('name', `%${project_name}%`)
            .limit(5);

          if (!projects || projects.length === 0) {
            return {
              error: `No project found matching "${project_name}". Try searching for projects first.`,
            };
          }

          if (projects.length > 1) {
            return {
              error: `Multiple projects match "${project_name}". Please be more specific.`,
              matches: projects.map((p) => ({ id: p.id, name: p.name })),
            };
          }

          targetProjectId = projects[0].id;
          projectInfo = projects[0];
        }

        if (!targetProjectId) {
          return { error: 'Please provide either project_id or project_name' };
        }

        // Get project info if we don't have it
        if (!projectInfo) {
          const { data } = await supabase
            .from('projects')
            .select('id, name, status')
            .eq('id', targetProjectId)
            .single();
          projectInfo = data;
        }

        if (!projectInfo) {
          return { error: 'Project not found' };
        }

        const oldStatus = projectInfo.status;

        // Update the project status
        const { error } = await supabase
          .from('projects')
          .update({
            status,
            updated_at: new Date().toISOString(),
            // If launched, set progress to 100%
            ...(status === 'Launched' ? { progress: 100 } : {}),
          })
          .eq('id', targetProjectId);

        if (error) return { error: error.message };

        // Log activity
        await supabase.from('activities').insert({
          actor_id: user.id,
          type: 'project_updated',
          project_id: targetProjectId,
          workspace_id: workspaceId,
          metadata: {
            field: 'status',
            old_value: oldStatus,
            new_value: status,
            updated_by_ai: true,
          },
        });

        return {
          success: true,
          message: `Updated "${projectInfo.name}" status: ${oldStatus} -> ${status}`,
          project: {
            id: targetProjectId,
            name: projectInfo.name,
            oldStatus,
            newStatus: status,
          },
        };
      },
    }),
  };
}
