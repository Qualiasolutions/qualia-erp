'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createItemSchema, updateItemSchema } from '@/lib/validation'

// Standard ActionResult type - use this for all server actions
export type ActionResult<T = unknown> = {
  success: boolean
  error?: string
  data?: T
}

// ============================================
// ITEMS (Example CRUD - replace with your entities)
// ============================================

export async function createItem(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  // Validate input
  const parsed = createItemSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' }
  }

  // Execute query
  const { data, error } = await supabase
    .from('items')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    console.error('createItem error:', error)
    return { success: false, error: error.message }
  }

  // Revalidate cache
  revalidatePath('/items')

  return { success: true, data }
}

export async function updateItem(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  // Validate input
  const parsed = updateItemSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' }
  }

  // Execute query
  const { data, error } = await supabase
    .from('items')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('updateItem error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/items')
  revalidatePath(`/items/${id}`)

  return { success: true, data }
}

export async function deleteItem(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('deleteItem error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/items')

  return { success: true }
}

export async function getItems() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getItems error:', error)
    return []
  }

  return data
}

export async function getItemById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('getItemById error:', error)
    return null
  }

  return data
}
