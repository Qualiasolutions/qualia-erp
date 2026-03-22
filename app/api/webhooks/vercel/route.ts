import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Create Supabase client lazily to avoid build-time errors
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface VercelDeploymentPayload {
  id: string;
  name: string;
  url: string;
  type: 'deployment.created' | 'deployment.ready' | 'deployment.error' | 'deployment.canceled';
  createdAt: number;
  payload: {
    deployment: {
      id: string;
      name: string;
      url: string;
      meta: {
        githubCommitSha?: string;
        githubCommitMessage?: string;
        githubCommitRef?: string;
      };
    };
    project: {
      id: string;
      name: string;
    };
    target?: 'production' | 'staging' | 'preview';
    error?: {
      message: string;
    };
  };
}

function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature || !process.env.VERCEL_WEBHOOK_SECRET) {
    // In development, allow unsigned webhooks
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    return false;
  }

  const hash = crypto
    .createHmac('sha1', process.env.VERCEL_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return `sha1=${hash}` === signature;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-vercel-signature');

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      console.error('[Vercel Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload: VercelDeploymentPayload = JSON.parse(body);
    console.log('[Vercel Webhook] Received:', payload.type, payload.payload?.project?.name);

    // Extract deployment info
    const { deployment, project, target, error } = payload.payload;
    const environment = target || 'preview';

    // Map Vercel event type to our status
    const statusMap: Record<string, string> = {
      'deployment.created': 'building',
      'deployment.ready': 'ready',
      'deployment.error': 'error',
      'deployment.canceled': 'canceled',
    };
    const status = statusMap[payload.type] || 'building';

    // Find our project by Vercel project ID
    const supabase = getSupabaseClient();
    const { data: ourProject } = await supabase
      .from('projects')
      .select('id, name')
      .or(`vercel_project_id.eq.${project.id},name.ilike.%${project.name}%`)
      .limit(1)
      .single();

    if (!ourProject) {
      console.log('[Vercel Webhook] Project not found:', project.name);
      // Still return 200 to acknowledge the webhook
      return NextResponse.json({ success: true, message: 'Project not linked' });
    }

    // Create or update deployment record
    const deploymentData = {
      project_id: ourProject.id,
      environment,
      vercel_deployment_id: deployment.id,
      vercel_project_id: project.id,
      status,
      url: deployment.url ? `https://${deployment.url}` : null,
      branch: deployment.meta?.githubCommitRef || null,
      commit_sha: deployment.meta?.githubCommitSha || null,
      commit_message: deployment.meta?.githubCommitMessage || null,
      ready_at: status === 'ready' ? new Date().toISOString() : null,
      error_message: error?.message || null,
    };

    // Upsert the deployment
    const { data: deploymentRecord, error: deploymentError } = await supabase
      .from('project_deployments')
      .upsert(deploymentData, {
        onConflict: 'vercel_deployment_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (deploymentError) {
      // If upsert fails due to missing unique constraint, just insert
      const { error: insertError } = await supabase
        .from('project_deployments')
        .insert(deploymentData)
        .select()
        .single();

      if (insertError) {
        console.error('[Vercel Webhook] Error saving deployment:', insertError);
      }
    }

    // Update environment with latest deployment (for production/staging only)
    if (environment === 'production' || environment === 'staging') {
      const { error: envError } = await supabase.from('project_environments').upsert(
        {
          project_id: ourProject.id,
          name: environment,
          url: deploymentData.url,
          vercel_project_id: project.id,
          last_deployment_id: deploymentRecord?.id,
          health_status: status === 'ready' ? 'healthy' : status === 'error' ? 'down' : 'unknown',
          last_checked_at: new Date().toISOString(),
        },
        {
          onConflict: 'project_id,name',
        }
      );

      if (envError) {
        console.error('[Vercel Webhook] Error updating environment:', envError);
      }
    }

    // ── Client-visible activity_log for production deploys ────────────
    if (status === 'ready' && environment === 'production') {
      // Resolve actor — project lead or first admin
      const { data: projLead } = await supabase
        .from('projects')
        .select('lead_id')
        .eq('id', ourProject.id)
        .single();

      let actorId = projLead?.lead_id;
      if (!actorId) {
        const { data: admin } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .limit(1)
          .single();
        actorId = admin?.id;
      }

      if (actorId) {
        const commitMsg = deployment.meta?.githubCommitMessage?.split('\n')[0] || '';
        await supabase.from('activity_log').insert({
          project_id: ourProject.id,
          action_type: 'deployment',
          actor_id: actorId,
          action_data: {
            title: `Deployed to production`,
            description: commitMsg
              ? `Latest change: ${commitMsg}`
              : `Live at https://${deployment.url}`,
            url: `https://${deployment.url}`,
            environment: 'production',
            commit_sha: deployment.meta?.githubCommitSha?.slice(0, 7),
          },
          is_client_visible: true,
        });
      }
    }

    console.log('[Vercel Webhook] Processed:', ourProject.name, status);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Vercel Webhook] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'vercel-webhook' });
}
