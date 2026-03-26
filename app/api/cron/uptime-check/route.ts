import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 30;

const UPTIMEROBOT_API_URL = 'https://api.uptimerobot.com/v2/getMonitors';
const FROM_EMAIL = 'Qualia Platform <notifications@qualiasolutions.net>';

type Monitor = {
  id: number;
  friendly_name: string;
  url: string;
  status: number;
};

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error('[cron/uptime-check] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.UPTIMEROBOT_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'UPTIMEROBOT_API_KEY not set' }, { status: 500 });
    }

    // Fetch monitors
    const res = await fetch(UPTIMEROBOT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, format: 'json' }),
    });

    const data = await res.json();
    if (data.stat !== 'ok') {
      return NextResponse.json({ error: 'UptimeRobot API error' }, { status: 502 });
    }

    const monitors: Monitor[] = data.monitors;
    const downMonitors = monitors.filter((m) => m.status === 9 || m.status === 8);

    if (downMonitors.length === 0) {
      return NextResponse.json({ status: 'all_up', checked: monitors.length });
    }

    // We have down/degraded services — send alerts
    const supabase = await createClient();

    // Get admin workspace
    const { data: workspace } = await supabase.from('workspaces').select('id').limit(1).single();

    if (!workspace) {
      console.error('[uptime-check] No workspace found');
      return NextResponse.json({ error: 'No workspace' }, { status: 500 });
    }

    // Get admin users for email
    const { data: admins } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('role', 'admin');

    // Create in-app notifications for each admin
    const downList = downMonitors
      .map((m) => `${m.friendly_name} (${m.status === 9 ? 'DOWN' : 'DEGRADED'})`)
      .join(', ');

    for (const admin of admins || []) {
      await supabase.from('notifications').insert({
        user_id: admin.id,
        workspace_id: workspace.id,
        type: 'system',
        title: `Service Alert: ${downMonitors.length} service${downMonitors.length > 1 ? 's' : ''} affected`,
        message: downList,
        link: '/status',
        metadata: {
          downMonitors: downMonitors.map((m) => ({
            name: m.friendly_name,
            url: m.url,
            status: m.status,
          })),
        },
      });
    }

    // Send email alert
    if (process.env.RESEND_API_KEY && admins && admins.length > 0) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      const servicesHtml = downMonitors
        .map(
          (m) => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">
            <strong>${m.friendly_name}</strong><br/>
            <span style="color: #666; font-size: 12px;">${m.url}</span>
          </td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; ${
              m.status === 9
                ? 'background: #fef2f2; color: #dc2626;'
                : 'background: #fffbeb; color: #d97706;'
            }">
              ${m.status === 9 ? 'DOWN' : 'DEGRADED'}
            </span>
          </td>
        </tr>`
        )
        .join('');

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 18px;">Service Alert</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">
              ${downMonitors.length} service${downMonitors.length > 1 ? 's' : ''} need attention
            </p>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 2px solid #e5e7eb;">
                  <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280;">Service</th>
                  <th style="padding: 8px 12px; text-align: center; font-size: 11px; text-transform: uppercase; color: #6b7280;">Status</th>
                </tr>
              </thead>
              <tbody>${servicesHtml}</tbody>
            </table>
            <div style="margin-top: 16px; text-align: center;">
              <a href="https://portal.qualiasolutions.net/status" style="display: inline-block; padding: 8px 20px; background: #00A4AC; color: white; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 500;">
                View Status Dashboard
              </a>
            </div>
          </div>
        </div>`;

      await resend.emails.send({
        from: FROM_EMAIL,
        to: admins.map((a) => a.email),
        subject: `[ALERT] ${downMonitors.length} service${downMonitors.length > 1 ? 's' : ''} ${downMonitors.some((m) => m.status === 9) ? 'down' : 'degraded'}`,
        html: emailHtml,
      });
    }

    return NextResponse.json({
      status: 'alerted',
      down: downMonitors.length,
      services: downMonitors.map((m) => m.friendly_name),
    });
  } catch (err) {
    console.error('[uptime-check] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
