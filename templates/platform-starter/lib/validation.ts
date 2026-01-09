import { z } from 'zod'

// ============================================
// ITEMS (Example - replace with your entities)
// ============================================

export const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
})

export const updateItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  description: z.string().optional(),
})

export type CreateItemInput = z.infer<typeof createItemSchema>
export type UpdateItemInput = z.infer<typeof updateItemSchema>

// ============================================
// Add more schemas below as needed
// ============================================

// Example: Projects schema
// export const createProjectSchema = z.object({
//   name: z.string().min(1, 'Name is required'),
//   client_id: z.string().uuid().optional(),
//   status: z.enum(['draft', 'active', 'completed']).default('draft'),
// })
