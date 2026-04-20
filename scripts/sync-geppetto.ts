/**
 * Wire the Geppetto GitHub repo into the ERP as a live project.
 *
 * - Upserts a "Geppetto AI" client row (workspace: Qualia)
 * - Updates the existing Geppetto project row with description, type, target date,
 *   team, client, and the github_repo_url
 * - Creates a github entry in project_integrations so the webhook can match future
 *   pushes to QualiaSolutionsCY/geppetto and sync .planning/
 *
 * Idempotent: re-running does not create duplicates.
 *
 * Run with: npx tsx scripts/sync-geppetto.ts
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const QUALIA_WORKSPACE_ID = 'bf96d0a9-1df8-4361-8df3-7b6d87a21343';
const AI_TEAM_ID = 'b0119d2c-cb24-4e11-b338-25e300ea49a8';
const FAWZI_PROFILE_ID = '696cbe99-20fe-437c-97fe-246fb3367d9b';
const GEPPETTO_PROJECT_ID = '7a5d3d58-78a5-4945-9906-15e22f8efe99';
const GEPPETTO_REPO_URL = 'https://github.com/QualiaSolutionsCY/geppetto';

const DESCRIPTION = `Voice shell (STT + TTS) for Arijit Sircar's locally-hosted AI assistant. Demo on 2026-04-21 (Zoom); v1 build follows 2026-05-01 if won. Multilingual (EN/ES/ZH), barge-in, self-ignore, voice ID. Stack: faster-whisper, coqui-tts XTTS, silero-vad, webrtc AEC, SpeechBrain ECAPA-TDNN, textual TUI. All open-source, all local, zero cloud calls.`;

async function upsertClient(): Promise<string> {
  // Check if a Geppetto AI client already exists
  const { data: existing } = await sb
    .from('clients')
    .select('id')
    .eq('workspace_id', QUALIA_WORKSPACE_ID)
    .ilike('display_name', 'Geppetto%')
    .maybeSingle();

  if (existing?.id) {
    console.log(`  client exists: ${existing.id}`);
    return existing.id;
  }

  const { data, error } = await sb
    .from('clients')
    .insert({
      workspace_id: QUALIA_WORKSPACE_ID,
      name: 'Geppetto AI',
      display_name: 'Geppetto AI',
      website: GEPPETTO_REPO_URL,
      lead_status: 'hot',
      notes:
        'Contact: Arijit Sircar <arijit.sircar@gmail.com>. v1 budget €5-10k, v1 start 2026-05-01. Demo 2026-04-21 on Zoom.',
      created_by: FAWZI_PROFILE_ID,
      assigned_to: FAWZI_PROFILE_ID,
    })
    .select('id')
    .single();

  if (error) throw error;
  console.log(`  client inserted: ${data.id}`);
  return data.id;
}

async function updateProject(clientId: string) {
  const { error } = await sb
    .from('projects')
    .update({
      description: DESCRIPTION,
      status: 'Active',
      client_id: clientId,
      team_id: AI_TEAM_ID,
      project_type: 'voice_agent',
      project_group: 'demos',
      target_date: '2026-04-21',
      start_date: '2026-04-16',
      github_repo_url: GEPPETTO_REPO_URL,
      deployment_platform: 'none',
    })
    .eq('id', GEPPETTO_PROJECT_ID);

  if (error) throw error;
  console.log(`  project updated: ${GEPPETTO_PROJECT_ID}`);
}

async function upsertGithubIntegration() {
  // Check if one already exists for this project + service
  const { data: existing } = await sb
    .from('project_integrations')
    .select('id, external_url')
    .eq('project_id', GEPPETTO_PROJECT_ID)
    .eq('service_type', 'github')
    .maybeSingle();

  if (existing?.id) {
    // Update URL if drifted
    if (existing.external_url !== GEPPETTO_REPO_URL) {
      await sb
        .from('project_integrations')
        .update({ external_url: GEPPETTO_REPO_URL })
        .eq('id', existing.id);
      console.log(`  github integration url updated: ${existing.id}`);
    } else {
      console.log(`  github integration exists: ${existing.id}`);
    }
    return;
  }

  const { data, error } = await sb
    .from('project_integrations')
    .insert({
      project_id: GEPPETTO_PROJECT_ID,
      service_type: 'github',
      external_url: GEPPETTO_REPO_URL,
      metadata: { default_branch: 'feature/demo-scaffold' },
    })
    .select('id')
    .single();

  if (error) throw error;
  console.log(`  github integration inserted: ${data.id}`);
}

async function main() {
  console.log('⚙ Wiring Geppetto project into Qualia ERP');
  console.log('  repo     :', GEPPETTO_REPO_URL);
  console.log('  project  :', GEPPETTO_PROJECT_ID);
  console.log('  workspace:', QUALIA_WORKSPACE_ID);
  console.log('');

  const clientId = await upsertClient();
  await updateProject(clientId);
  await upsertGithubIntegration();

  console.log('\n✓ Done. Verifying final state:');
  const { data: proj } = await sb
    .from('projects')
    .select(
      'id, name, status, project_type, project_group, team_id, client_id, target_date, github_repo_url, description'
    )
    .eq('id', GEPPETTO_PROJECT_ID)
    .single();
  console.log(JSON.stringify(proj, null, 2));

  const { data: integrations } = await sb
    .from('project_integrations')
    .select('id, service_type, external_url, metadata, connected_at')
    .eq('project_id', GEPPETTO_PROJECT_ID);
  console.log('\nIntegrations:');
  console.table(integrations ?? []);
}

main().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
