'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const passwordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export async function changePassword(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const raw = formData.get('newPassword');
  const parsed = passwordSchema.safeParse({ newPassword: raw });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid password' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
