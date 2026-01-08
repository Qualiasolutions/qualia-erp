'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getProjectPhases(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_phases')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[getProjectPhases] Error:', error);
    return [];
  }
  return data;
}

export async function createProjectPhase(projectId: string, name: string) {
  const supabase = await createClient();

  // Get current max sort_order
  const { data: existingPhases } = await supabase
    .from('project_phases')
    .select('sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder =
    existingPhases && existingPhases.length > 0 ? (existingPhases[0].sort_order || 0) + 1 : 0;

  const { data, error } = await supabase
    .from('project_phases')
    .insert({
      project_id: projectId,
      name,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    console.error('[createProjectPhase] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true, data };
}

export async function deleteProjectPhase(phaseId: string, projectId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from('project_phases').delete().eq('id', phaseId);

  if (error) {
    console.error('[deleteProjectPhase] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function updateProjectPhase(phaseId: string, name: string, projectId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from('project_phases').update({ name }).eq('id', phaseId);

  if (error) {
    console.error('[updateProjectPhase] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}
