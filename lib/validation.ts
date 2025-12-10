import { z } from 'zod';

// =====================
// Issue Schemas
// =====================
export const createIssueSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title must be less than 500 characters'),
  description: z.string().max(10000, 'Description too long').optional().nullable(),
  status: z
    .enum(['Yet to Start', 'Todo', 'In Progress', 'Done', 'Canceled'] as const)
    .default('Yet to Start'),
  priority: z
    .enum(['No Priority', 'Urgent', 'High', 'Medium', 'Low'] as const)
    .default('No Priority'),
  team_id: z.string().uuid('Invalid team ID').optional().nullable(),
  project_id: z.string().uuid('Invalid project ID').optional().nullable(),
  parent_id: z.string().uuid('Invalid parent ID').optional().nullable(),
  workspace_id: z.string().uuid('Invalid workspace ID').optional().nullable(),
  assignee_id: z.string().uuid('Invalid assignee ID').optional().nullable(),
});

export const updateIssueSchema = z.object({
  id: z.string().uuid('Invalid issue ID'),
  title: z.string().min(1, 'Title is required').max(500).optional(),
  description: z.string().max(10000).optional().nullable(),
  status: z.enum(['Yet to Start', 'Todo', 'In Progress', 'Done', 'Canceled'] as const).optional(),
  priority: z.enum(['No Priority', 'Urgent', 'High', 'Medium', 'Low'] as const).optional(),
  team_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
});

// =====================
// Project Schemas
// =====================
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be less than 200 characters'),
  description: z.string().max(5000, 'Description too long').optional().nullable(),
  status: z
    .enum(['Demos', 'Active', 'Launched', 'Delayed', 'Archived', 'Canceled'] as const)
    .default('Active'),
  project_group: z
    .enum([
      'salman_kuwait',
      'tasos_kyriakides',
      'finished',
      'inactive',
      'active',
      'demos',
      'other',
    ] as const)
    .optional()
    .nullable(),
  project_type: z
    .enum(['web_design', 'ai_agent', 'voice_agent', 'seo', 'ads'] as const)
    .optional()
    .nullable(),
  deployment_platform: z
    .enum(['vercel', 'squarespace', 'railway'] as const)
    .optional()
    .nullable(),
  team_id: z.string().uuid('Invalid team ID').optional().nullable(),
  client_id: z.string().uuid('Invalid client ID').optional().nullable(),
  lead_id: z.string().uuid('Invalid lead ID').optional().nullable(),
  start_date: z.string().optional().nullable(),
  target_date: z.string().optional().nullable(),
  workspace_id: z.string().uuid('Invalid workspace ID').optional().nullable(),
});

// Schema for the project creation wizard (with required fields)
export const createProjectWizardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be less than 200 characters'),
  description: z.string().max(5000, 'Description too long').optional().nullable(),
  project_type: z.enum(['web_design', 'ai_agent', 'voice_agent', 'seo', 'ads'] as const, {
    message: 'Project type is required',
  }),
  deployment_platform: z.enum(['vercel', 'squarespace', 'railway'] as const, {
    message: 'Deployment platform is required',
  }),
  client_id: z.string().uuid('Invalid client ID'),
  team_id: z.string().uuid('Invalid team ID'),
  workspace_id: z.string().uuid('Invalid workspace ID').optional().nullable(),
  // Roadmap customization
  phases: z
    .array(
      z.object({
        name: z.string().min(1, 'Phase name is required').max(200),
        description: z.string().max(2000).optional().nullable(),
        template_key: z.string().max(100).optional().nullable(),
        items: z
          .array(
            z.object({
              title: z.string().min(1, 'Item title is required').max(500),
              description: z.string().max(2000).optional().nullable(),
              template_key: z.string().max(100).optional().nullable(),
            })
          )
          .optional(),
      })
    )
    .optional(),
});

export const updateProjectSchema = z.object({
  id: z.string().uuid('Invalid project ID'),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z
    .enum(['Demos', 'Active', 'Launched', 'Delayed', 'Archived', 'Canceled'] as const)
    .optional(),
  project_group: z
    .enum([
      'salman_kuwait',
      'tasos_kyriakides',
      'finished',
      'inactive',
      'active',
      'demos',
      'other',
    ] as const)
    .optional()
    .nullable(),
  project_type: z
    .enum(['web_design', 'ai_agent', 'voice_agent', 'seo', 'ads'] as const)
    .optional()
    .nullable(),
  deployment_platform: z
    .enum(['vercel', 'squarespace', 'railway'] as const)
    .optional()
    .nullable(),
  team_id: z.string().uuid().optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  lead_id: z.string().uuid().optional().nullable(),
  start_date: z.string().optional().nullable(),
  target_date: z.string().optional().nullable(),
});

// =====================
// Team Schemas
// =====================
export const createTeamSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  key: z
    .string()
    .min(1, 'Key is required')
    .max(10, 'Key must be less than 10 characters')
    .regex(/^[A-Z0-9]+$/, 'Key must be uppercase alphanumeric'),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  workspace_id: z.string().uuid('Invalid workspace ID').optional().nullable(),
});

// =====================
// Client Schemas
// =====================
export const createClientSchema = z.object({
  display_name: z
    .string()
    .min(1, 'Client name is required')
    .max(200, 'Name must be less than 200 characters'),
  description: z.string().max(2000).optional().nullable(),
  website: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  phone: z.string().max(50).optional().nullable(),
  billing_address: z.string().max(500).optional().nullable(),
  lead_status: z
    .enum(['dropped', 'cold', 'hot', 'active_client', 'inactive_client', 'dead_lead'] as const)
    .default('cold'),
  notes: z.string().max(5000).optional().nullable(),
  assigned_to: z.string().uuid('Invalid user ID').optional().nullable(),
  workspace_id: z.string().uuid('Invalid workspace ID').optional().nullable(),
});

export const updateClientSchema = z.object({
  id: z.string().uuid('Invalid client ID'),
  display_name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal('')),
  phone: z.string().max(50).optional().nullable(),
  billing_address: z.string().max(500).optional().nullable(),
  lead_status: z
    .enum(['dropped', 'cold', 'hot', 'active_client', 'inactive_client', 'dead_lead'] as const)
    .optional()
    .nullable(),
  notes: z.string().max(5000).optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
});

// =====================
// Meeting Schemas
// =====================
export const createMeetingSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title must be less than 200 characters'),
    description: z.string().max(2000, 'Description too long').optional().nullable(),
    start_time: z.string().min(1, 'Start time is required'),
    end_time: z.string().min(1, 'End time is required'),
    project_id: z.string().uuid('Invalid project ID').optional().nullable(),
    client_id: z.string().uuid('Invalid client ID').optional().nullable(),
    workspace_id: z.string().uuid('Invalid workspace ID').optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.start_time && data.end_time) {
        return new Date(data.end_time) > new Date(data.start_time);
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['end_time'],
    }
  );

// =====================
// Phase Schemas (Roadmap)
// =====================
export const PHASE_STATUSES = ['not_started', 'in_progress', 'completed', 'skipped'] as const;
export type PhaseStatus = (typeof PHASE_STATUSES)[number];

export const createPhaseSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  workspace_id: z.string().uuid('Invalid workspace ID'),
  name: z
    .string()
    .min(1, 'Phase name is required')
    .max(200, 'Name must be less than 200 characters'),
  description: z.string().max(2000, 'Description too long').optional().nullable(),
  helper_text: z.string().max(500, 'Helper text too long').optional().nullable(),
  display_order: z.coerce.number().int().min(0).default(0),
  status: z.enum(PHASE_STATUSES).default('not_started'),
  template_key: z.string().max(100).optional().nullable(),
  is_custom: z.coerce.boolean().default(false),
});

export const updatePhaseSchema = z.object({
  id: z.string().uuid('Invalid phase ID'),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  helper_text: z.string().max(500).optional().nullable(),
  display_order: z.coerce.number().int().min(0).optional(),
  status: z.enum(PHASE_STATUSES).optional(),
});

export const createPhaseItemSchema = z.object({
  phase_id: z.string().uuid('Invalid phase ID'),
  title: z
    .string()
    .min(1, 'Item title is required')
    .max(500, 'Title must be less than 500 characters'),
  description: z.string().max(2000, 'Description too long').optional().nullable(),
  helper_text: z.string().max(500, 'Helper text too long').optional().nullable(),
  display_order: z.coerce.number().int().min(0).default(0),
  linked_issue_id: z.string().uuid('Invalid issue ID').optional().nullable(),
  template_key: z.string().max(100).optional().nullable(),
  is_custom: z.coerce.boolean().default(false),
});

export const updatePhaseItemSchema = z.object({
  id: z.string().uuid('Invalid item ID'),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional().nullable(),
  helper_text: z.string().max(500).optional().nullable(),
  display_order: z.coerce.number().int().min(0).optional(),
  is_completed: z.coerce.boolean().optional(),
  linked_issue_id: z.string().uuid().optional().nullable(),
});

// =====================
// Comment Schemas
// =====================
export const createCommentSchema = z.object({
  body: z.string().min(1, 'Comment cannot be empty').max(10000, 'Comment too long'),
  issue_id: z.string().uuid('Invalid issue ID'),
});

// =====================
// Workspace Schemas
// =====================
export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(500).optional().nullable(),
});

// =====================
// Helper Functions
// =====================

/**
 * Parses FormData against a Zod schema and returns either validated data or an error message
 */
export function parseFormData<T>(
  schema: z.ZodSchema<T>,
  formData: FormData
): { success: true; data: T } | { success: false; error: string } {
  // Convert FormData to object, handling empty strings as null
  const obj: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    // Convert empty strings to null for optional fields
    if (value === '' || value === 'null' || value === 'undefined') {
      obj[key] = null;
    } else {
      obj[key] = value;
    }
  });

  const result = schema.safeParse(obj);
  if (!result.success) {
    // Return the first error message
    const firstError = result.error.issues[0];
    return {
      success: false,
      error: firstError?.message || 'Validation failed',
    };
  }
  return { success: true, data: result.data };
}

/**
 * Validates a plain object against a Zod schema
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstError = result.error.issues[0];
    return {
      success: false,
      error: firstError?.message || 'Validation failed',
    };
  }
  return { success: true, data: result.data };
}

// Type exports for use in components
export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateProjectWizardInput = z.infer<typeof createProjectWizardSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type CreatePhaseInput = z.infer<typeof createPhaseSchema>;
export type UpdatePhaseInput = z.infer<typeof updatePhaseSchema>;
export type CreatePhaseItemInput = z.infer<typeof createPhaseItemSchema>;
export type UpdatePhaseItemInput = z.infer<typeof updatePhaseItemSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
