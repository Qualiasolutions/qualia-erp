import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

export const maxDuration = 30;

const ADMIN_EMAIL = 'fawzi@qualiasolutions.net';
const FROM_EMAIL = 'Qualia Platform <notifications@qualiasolutions.net>';

/**
 * Daily attendance report cron (runs at 6 PM UTC Mon-Fri).
 * Sends Fawzi a summary of who clocked in today and who didn't.
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];
    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    // Get all employees
    const { data: employees } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'employee');

    if (!employees || employees.length === 0) {
      return NextResponse.json({ message: 'No employees found' });
    }

    // Get today's sessions for all employees
    const { data: sessions, error: sessionsError } = await supabase
      .from('work_sessions')
      .select('profile_id, started_at, ended_at, duration_minutes')
      .gte('started_at', `${today}T00:00:00.000Z`)
      .in(
        'profile_id',
        employees.map((e) => e.id)
      );

    if (sessionsError) {
      console.error('[attendance-report] Sessions query error:', sessionsError);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    // Build report
    const clockedIn: { name: string; sessionCount: number }[] = [];
    const absent: string[] = [];

    for (const emp of employees) {
      const empSessions = (sessions || []).filter((s) => s.profile_id === emp.id);
      if (empSessions.length > 0) {
        clockedIn.push({
          name: emp.full_name || emp.email || 'Unknown',
          sessionCount: empSessions.length,
        });
      } else {
        absent.push(emp.full_name || emp.email || 'Unknown');
      }
    }

    // Build email HTML
    const html = buildReportHtml(dayName, today, clockedIn, absent);

    // Send email
    if (!process.env.RESEND_API_KEY) {
      console.log('[attendance-report] No RESEND_API_KEY, skipping email');
      return NextResponse.json({ clockedIn: clockedIn.length, absent: absent.length });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `Attendance Report — ${dayName}, ${today}${absent.length > 0 ? ` (${absent.length} absent)` : ''}`,
      html,
    });

    console.log(`[attendance-report] Sent: ${clockedIn.length} present, ${absent.length} absent`);
    return NextResponse.json({ success: true, clockedIn: clockedIn.length, absent: absent.length });
  } catch (error) {
    console.error('[attendance-report] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildReportHtml(
  dayName: string,
  date: string,
  clockedIn: { name: string; sessionCount: number }[],
  absent: string[]
): string {
  const absentSection =
    absent.length > 0
      ? `
    <div style="margin-top:16px;padding:12px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;">
      <strong style="color:#dc2626;">Did NOT clock in (${absent.length}):</strong>
      <ul style="margin:8px 0 0;padding-left:20px;">
        ${absent.map((name) => `<li style="color:#991b1b;">${escapeHtml(name)}</li>`).join('')}
      </ul>
    </div>`
      : '';

  const presentSection =
    clockedIn.length > 0
      ? `
    <div style="margin-top:16px;padding:12px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
      <strong style="color:#16a34a;">Clocked in (${clockedIn.length}):</strong>
      <ul style="margin:8px 0 0;padding-left:20px;">
        ${clockedIn
          .map((emp) => {
            return `<li style="color:#166534;">${escapeHtml(emp.name)} — ${emp.sessionCount} session${emp.sessionCount > 1 ? 's' : ''}</li>`;
          })
          .join('')}
      </ul>
    </div>`
      : '';

  return `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 4px;color:#0f172a;">Attendance Report</h2>
      <p style="margin:0 0 16px;color:#64748b;font-size:14px;">${dayName}, ${date}</p>
      ${absentSection}
      ${presentSection}
      <p style="margin-top:24px;font-size:12px;color:#94a3b8;">
        Sent by Qualia ERP attendance tracker
      </p>
    </div>
  `;
}
