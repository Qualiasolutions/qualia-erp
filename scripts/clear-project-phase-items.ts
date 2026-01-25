import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearPhaseItemsForProjects() {
  // Check phases directly
  const { data: allPhases, error: allPhasesErr } = await supabase
    .from('project_phases')
    .select('id, name, project_id');

  console.log('All phases:', allPhases?.length || 0, allPhasesErr?.message || '');

  // Check phase items directly
  const { data: allItems, error: allItemsErr } = await supabase
    .from('phase_items')
    .select('id, title, phase_id');

  console.log('All phase items:', allItems?.length || 0, allItemsErr?.message || '');

  // First list all projects
  const { data: allProjects, error: projErr } = await supabase
    .from('projects')
    .select('id, name')
    .order('name');

  console.log(
    'All projects:',
    allProjects?.length || 0,
    projErr?.message || '',
    allProjects?.map((p) => p.name)
  );

  // Find projects matching the names
  const projectNames = ['inrvoo', 'vero', 'inrvo'];

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name')
    .or(projectNames.map((n) => `name.ilike.%${n}%`).join(','));

  if (projectsError) {
    console.error('Error finding projects:', projectsError.message);
    process.exit(1);
  }

  console.log(
    'Found projects:',
    projects?.map((p) => p.name)
  );

  if (!projects || projects.length === 0) {
    console.log('No matching projects found');
    return;
  }

  const projectIds = projects.map((p) => p.id);

  // Get phases for these projects
  const { data: phases, error: phasesError } = await supabase
    .from('project_phases')
    .select('id, name, project_id')
    .in('project_id', projectIds);

  if (phasesError) {
    console.error('Error finding phases:', phasesError.message);
    process.exit(1);
  }

  console.log('Found', phases?.length || 0, 'phases');

  if (!phases || phases.length === 0) {
    console.log('No phases found for these projects');
    return;
  }

  const phaseIds = phases.map((p) => p.id);

  // Count phase items before deletion
  const { count } = await supabase
    .from('phase_items')
    .select('*', { count: 'exact', head: true })
    .in('phase_id', phaseIds);

  console.log('Phase items to delete:', count || 0);

  if (!count || count === 0) {
    console.log('No phase items to delete');
    return;
  }

  // Delete phase items
  const { error: deleteError } = await supabase
    .from('phase_items')
    .delete()
    .in('phase_id', phaseIds);

  if (deleteError) {
    console.error('Error deleting phase items:', deleteError.message);
    process.exit(1);
  }

  console.log(
    'Deleted',
    count,
    'phase items from projects:',
    projects.map((p) => p.name).join(', ')
  );
}

clearPhaseItemsForProjects();
