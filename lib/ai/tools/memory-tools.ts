/**
 * Memory AI Tools
 * Tools for autonomous memory, reminders, and trainee progress tracking
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  loadUserMemory,
  storeMemory,
  deleteMemory,
  createReminder,
  loadPendingReminders,
  markReminderDelivered,
  loadTraineeProgress,
  type MemoryCategory,
  type MemorySource,
} from '@/lib/ai/memory';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Create memory tools for the AI agent
 * These allow the AI to autonomously remember facts and manage reminders
 */
export function createMemoryTools(
  supabase: SupabaseClient,
  workspaceId: string | null,
  userId: string
) {
  if (!workspaceId) return {};

  return {
    rememberFact: tool({
      description:
        'Store a fact about the user for future conversations. Call this AUTOMATICALLY when you observe something worth remembering: preferences, skills, habits, project associations, or personal facts. Examples: "User prefers dark mode", "Knows React well", "Working on Aquador project", "Usually checks tasks in the morning".',
      inputSchema: z.object({
        category: z
          .enum(['preference', 'skill', 'project', 'fact', 'habit'])
          .describe('Category of the memory'),
        content: z.string().describe('The fact to remember (concise, specific)'),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe('How confident you are (0-1, default 0.8)'),
      }),
      execute: async ({
        category,
        content,
        confidence,
      }: {
        category: MemoryCategory;
        content: string;
        confidence?: number;
      }) => {
        const result = await storeMemory(
          userId,
          workspaceId,
          category,
          content,
          'conversation' as MemorySource,
          confidence
        );
        if (!result.success) return { error: result.error };
        return { message: 'Remembered', category, content };
      },
    }),

    getUserMemories: tool({
      description:
        'Recall what you know about the current user. Use when user asks "who am I?", "what do you know about me?", "what have I been working on?".',
      inputSchema: z.object({
        category: z
          .enum(['preference', 'skill', 'project', 'fact', 'habit'])
          .optional()
          .describe('Filter by category'),
      }),
      execute: async ({ category }: { category?: MemoryCategory }) => {
        const memories = await loadUserMemory(userId, workspaceId);
        const filtered = category ? memories.filter((m) => m.category === category) : memories;

        // Group by category for cleaner output
        const grouped: Record<string, string[]> = {};
        for (const m of filtered) {
          if (!grouped[m.category]) grouped[m.category] = [];
          grouped[m.category].push(m.content);
        }

        return { totalMemories: filtered.length, memories: grouped };
      },
    }),

    forgetFact: tool({
      description:
        'Remove a stored memory about the user. Use when user says "forget that", "that\'s not true anymore", "remove that memory".',
      inputSchema: z.object({
        memory_id: z.string().uuid().describe('The memory ID to delete'),
      }),
      execute: async ({ memory_id }: { memory_id: string }) => {
        const result = await deleteMemory(memory_id, userId);
        if (!result.success) return { error: result.error };
        return { message: 'Memory removed' };
      },
    }),

    getUserActivity: tool({
      description:
        'Get a user\'s recent activity and assigned tasks. Use when asked "what did Tarek do this week?", "who is working on what?".',
      inputSchema: z.object({
        target_user_name: z
          .string()
          .optional()
          .describe('Name of the user to look up (searches profiles). Omit for current user.'),
      }),
      execute: async ({ target_user_name }: { target_user_name?: string }) => {
        let targetId = userId;

        // If looking up another user, search by name
        if (target_user_name) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .ilike('full_name', `%${target_user_name}%`)
            .limit(1);

          if (!profiles || profiles.length === 0) {
            return { error: `No user found matching "${target_user_name}"` };
          }
          targetId = profiles[0].id;
        }

        // Get recent tasks
        const { data: tasks } = await supabase
          .from('tasks')
          .select('title, status, priority, updated_at, project:projects(name)')
          .eq('assigned_to', targetId)
          .order('updated_at', { ascending: false })
          .limit(10);

        // Get recent activities
        const { data: activities } = await supabase
          .from('activities')
          .select('type, created_at, metadata')
          .eq('actor_id', targetId)
          .order('created_at', { ascending: false })
          .limit(10);

        return {
          recentTasks: (tasks || []).map((t) => ({
            title: t.title,
            status: t.status,
            priority: t.priority,
            project: Array.isArray(t.project) ? t.project[0]?.name : null,
            updatedAt: t.updated_at,
          })),
          recentActivity: (activities || []).map((a) => ({
            type: a.type,
            at: a.created_at,
          })),
        };
      },
    }),

    createReminder: tool({
      description:
        'Create a reminder for the user. Use when user says "remind me to deploy tomorrow", "set a reminder for Friday", "remind me about the meeting".',
      inputSchema: z.object({
        content: z.string().describe('What to remind about'),
        due_at: z.string().describe('When to remind (ISO 8601 datetime)'),
        is_recurring: z.boolean().optional().describe('Whether this repeats'),
        recurrence_rule: z
          .enum(['daily', 'weekly', 'weekdays', 'monthly'])
          .optional()
          .describe('How often it repeats'),
      }),
      execute: async ({
        content,
        due_at,
        is_recurring,
        recurrence_rule,
      }: {
        content: string;
        due_at: string;
        is_recurring?: boolean;
        recurrence_rule?: string;
      }) => {
        const result = await createReminder(
          userId,
          workspaceId,
          content,
          due_at,
          is_recurring,
          recurrence_rule
        );
        if (!result.success) return { error: result.error };
        return {
          message: `Reminder set for ${new Date(due_at).toLocaleString()}`,
          id: result.id,
          content,
        };
      },
    }),

    getReminders: tool({
      description:
        'Get pending reminders for the user. Use when user asks "what should I be doing?", "any reminders?", "what\'s pending?".',
      inputSchema: z.object({
        _placeholder: z.string().optional().describe('Not used'),
      }),
      execute: async () => {
        const reminders = await loadPendingReminders(userId, workspaceId);
        return {
          count: reminders.length,
          reminders: reminders.map((r) => ({
            id: r.id,
            content: r.content,
            dueAt: r.due_at,
            isRecurring: r.is_recurring,
            rule: r.recurrence_rule,
          })),
        };
      },
    }),

    dismissReminder: tool({
      description:
        "Mark a reminder as delivered/done. Use after you've told the user about a reminder.",
      inputSchema: z.object({
        reminder_id: z.string().uuid().describe('Reminder ID to dismiss'),
      }),
      execute: async ({ reminder_id }: { reminder_id: string }) => {
        await markReminderDelivered(reminder_id);
        return { message: 'Reminder dismissed' };
      },
    }),

    getTraineeProgress: tool({
      description:
        'Get trainee progress on their project phases. Use when asked "show progress", "how far along is Tarek?", "trainee status". Admins can view any trainee, employees see their own.',
      inputSchema: z.object({
        target_user_name: z
          .string()
          .optional()
          .describe('Trainee name (admin only, omit for current user)'),
        project_id: z.string().uuid().optional().describe('Filter by specific project'),
      }),
      execute: async ({
        target_user_name,
        project_id,
      }: {
        target_user_name?: string;
        project_id?: string;
      }) => {
        let targetId = userId;

        if (target_user_name) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .ilike('full_name', `%${target_user_name}%`)
            .limit(1);

          if (!profiles || profiles.length === 0) {
            return { error: `No user found matching "${target_user_name}"` };
          }
          targetId = profiles[0].id;
        }

        const progress = await loadTraineeProgress(targetId, workspaceId, project_id);

        if (progress.length === 0) {
          return { message: 'No trainee progress tracked yet for this user.' };
        }

        // Group by project
        const byProject: Record<string, typeof progress> = {};
        for (const entry of progress) {
          const key = entry.project_name || entry.project_id || 'unassigned';
          if (!byProject[key]) byProject[key] = [];
          byProject[key].push(entry);
        }

        return {
          totalPhases: progress.length,
          completed: progress.filter((p) => p.status === 'completed').length,
          inProgress: progress.filter((p) => p.status === 'in_progress').length,
          stuck: progress.filter((p) => p.status === 'stuck').length,
          projects: byProject,
        };
      },
    }),
  };
}
