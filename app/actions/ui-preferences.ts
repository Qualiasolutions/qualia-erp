'use server';

import { createClient } from '@/lib/supabase/server';
import { ActionResult } from './shared';

export type UIDensity = 'compact' | 'default' | 'spacious';

const DENSITIES = new Set<UIDensity>(['compact', 'default', 'spacious']);

export async function getUIDensity(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('profiles')
      .select('ui_density')
      .eq('id', user.id)
      .single();
    if (error) throw error;

    return { success: true, data: { density: (data.ui_density as UIDensity) ?? 'default' } };
  } catch (error) {
    console.error('[getUIDensity] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get density',
    };
  }
}

export async function updateUIDensity(density: UIDensity): Promise<ActionResult> {
  try {
    if (!DENSITIES.has(density)) {
      return { success: false, error: 'Invalid density value' };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('profiles')
      .update({ ui_density: density })
      .eq('id', user.id);
    if (error) throw error;

    return { success: true, data: { density } };
  } catch (error) {
    console.error('[updateUIDensity] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update density',
    };
  }
}
