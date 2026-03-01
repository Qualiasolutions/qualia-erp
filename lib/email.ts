'use server';

import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';

// Lazy initialization to avoid errors when API key is missing
let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

// Email sender configuration
const FROM_EMAIL = 'Qualia Platform <notifications@qualiasolutions.net>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://qualia-erp.vercel.app';

// Types for notification data
type NotificationData = {
  creatorName: string;
  creatorEmail: string;
  entityType: 'task' | 'project' | 'meeting' | 'client' | 'issue';
  entityName: string;
  entityId: string;
  additionalInfo?: Record<string, string>;
};

type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
};

/**
 * Get all admin users except the current user
 */
export async function getOtherAdmins(excludeUserId: string): Promise<AdminUser[]> {
  const supabase = await createClient();

  const { data: admins, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('role', 'admin')
    .neq('id', excludeUserId);

  if (error) {
    console.error('[getOtherAdmins] Error fetching admins:', error);
    return [];
  }

  // Filter out users without emails
  return (admins || []).filter((admin): admin is AdminUser => !!admin.email);
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string): Promise<AdminUser | null> {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    console.error('[getUserProfile] Error fetching profile:', error);
    return null;
  }

  return profile as AdminUser;
}

/**
 * Generate email HTML for entity creation notification
 */
function generateEmailHtml(data: NotificationData, recipientName: string): string {
  const entityTypeLabels: Record<string, string> = {
    task: 'Task',
    project: 'Project',
    meeting: 'Meeting',
    client: 'Client',
    issue: 'Issue',
  };

  const entityTypeUrls: Record<string, string> = {
    task: 'inbox',
    project: 'projects',
    meeting: 'schedule',
    client: 'clients',
    issue: 'issues',
  };

  const entityLabel = entityTypeLabels[data.entityType] || data.entityType;
  const entityUrl = `${APP_URL}/${entityTypeUrls[data.entityType]}/${data.entityId}`;

  let additionalInfoHtml = '';
  if (data.additionalInfo) {
    const infoItems = Object.entries(data.additionalInfo)
      .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
      .join('');
    additionalInfoHtml = `<ul style="margin: 16px 0; padding-left: 20px; color: #4b5563;">${infoItems}</ul>`;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New ${entityLabel} Created</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Qualia Platform</h1>
  </div>

  <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 16px; color: #6b7280;">Hi ${recipientName || 'there'},</p>

    <p style="margin: 0 0 24px; font-size: 16px;">
      <strong>${data.creatorName}</strong> has created a new <strong>${entityLabel.toLowerCase()}</strong>:
    </p>

    <div style="background: #f9fafb; border-left: 4px solid #6366f1; padding: 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0;">
      <h2 style="margin: 0 0 8px; color: #1f2937; font-size: 18px;">${data.entityName}</h2>
      <p style="margin: 0; color: #6b7280; font-size: 14px;">Type: ${entityLabel}</p>
    </div>

    ${additionalInfoHtml}

    <a href="${entityUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; margin-top: 8px;">
      View ${entityLabel}
    </a>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
      This notification was sent from the Qualia Platform. You're receiving this because you're an admin user.
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email for entity creation notification
 */
function generateEmailText(data: NotificationData, recipientName: string): string {
  const entityTypeLabels: Record<string, string> = {
    task: 'Task',
    project: 'Project',
    meeting: 'Meeting',
    client: 'Client',
    issue: 'Issue',
  };

  const entityTypeUrls: Record<string, string> = {
    task: 'inbox',
    project: 'projects',
    meeting: 'schedule',
    client: 'clients',
    issue: 'issues',
  };

  const entityLabel = entityTypeLabels[data.entityType] || data.entityType;
  const entityUrl = `${APP_URL}/${entityTypeUrls[data.entityType]}/${data.entityId}`;

  let additionalInfo = '';
  if (data.additionalInfo) {
    additionalInfo = Object.entries(data.additionalInfo)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');
    additionalInfo = `\n\nDetails:\n${additionalInfo}`;
  }

  return `
Hi ${recipientName || 'there'},

${data.creatorName} has created a new ${entityLabel.toLowerCase()}:

${data.entityName}
Type: ${entityLabel}
${additionalInfo}

View it here: ${entityUrl}

---
This notification was sent from the Qualia Platform.
  `.trim();
}

/**
 * Send email notification to other admin users when an entity is created
 */
export async function notifyAdminsOfCreation(
  creatorId: string,
  entityType: NotificationData['entityType'],
  entityName: string,
  entityId: string,
  additionalInfo?: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get creator profile
    const creator = await getUserProfile(creatorId);
    if (!creator) {
      console.error('[notifyAdminsOfCreation] Creator profile not found');
      return { success: false, error: 'Creator profile not found' };
    }

    // Get other admin users
    const otherAdmins = await getOtherAdmins(creatorId);
    if (otherAdmins.length === 0) {
      console.log('[notifyAdminsOfCreation] No other admins to notify');
      return { success: true }; // Not an error, just no one to notify
    }

    const notificationData: NotificationData = {
      creatorName: creator.full_name || creator.email || 'A team member',
      creatorEmail: creator.email || '',
      entityType,
      entityName,
      entityId,
      additionalInfo,
    };

    // Check if Resend is configured
    const resendClient = getResendClient();
    if (!resendClient) {
      console.warn(
        '[notifyAdminsOfCreation] Resend API key not configured, skipping email notifications'
      );
      return { success: true }; // Silent success when not configured
    }

    // Send emails to all other admins
    const emailPromises = otherAdmins.map(async (admin) => {
      const subject = `New ${entityType} created: ${entityName}`;

      try {
        const { error } = await resendClient.emails.send({
          from: FROM_EMAIL,
          to: admin.email,
          subject,
          html: generateEmailHtml(notificationData, admin.full_name || ''),
          text: generateEmailText(notificationData, admin.full_name || ''),
        });

        if (error) {
          console.error(`[notifyAdminsOfCreation] Failed to send email to ${admin.email}:`, error);
          return { success: false, email: admin.email, error };
        }

        console.log(`[notifyAdminsOfCreation] Email sent to ${admin.email}`);
        return { success: true, email: admin.email };
      } catch (err) {
        console.error(`[notifyAdminsOfCreation] Exception sending email to ${admin.email}:`, err);
        return { success: false, email: admin.email, error: err };
      }
    });

    const results = await Promise.all(emailPromises);
    const failures = results.filter((r) => !r.success);

    if (failures.length > 0) {
      console.warn(
        `[notifyAdminsOfCreation] Some emails failed:`,
        failures.map((f) => f.email)
      );
    }

    return { success: true };
  } catch (error) {
    console.error('[notifyAdminsOfCreation] Unexpected error:', error);
    return { success: false, error: String(error) };
  }
}

// Convenience functions for specific entity types

export async function notifyTaskCreated(
  creatorId: string,
  taskTitle: string,
  taskId: string,
  projectName?: string,
  dueDate?: string
): Promise<{ success: boolean; error?: string }> {
  const additionalInfo: Record<string, string> = {};
  if (projectName) additionalInfo['Project'] = projectName;
  if (dueDate) additionalInfo['Due Date'] = dueDate;

  return notifyAdminsOfCreation(creatorId, 'task', taskTitle, taskId, additionalInfo);
}

export async function notifyProjectCreated(
  creatorId: string,
  projectName: string,
  projectId: string,
  teamName?: string,
  targetDate?: string
): Promise<{ success: boolean; error?: string }> {
  const additionalInfo: Record<string, string> = {};
  if (teamName) additionalInfo['Team'] = teamName;
  if (targetDate) additionalInfo['Target Date'] = targetDate;

  return notifyAdminsOfCreation(creatorId, 'project', projectName, projectId, additionalInfo);
}

export async function notifyMeetingCreated(
  creatorId: string,
  meetingTitle: string,
  meetingId: string,
  startTime?: string,
  endTime?: string,
  clientName?: string
): Promise<{ success: boolean; error?: string }> {
  const additionalInfo: Record<string, string> = {};
  if (startTime) additionalInfo['Start Time'] = startTime;
  if (endTime) additionalInfo['End Time'] = endTime;
  if (clientName) additionalInfo['Client'] = clientName;

  return notifyAdminsOfCreation(creatorId, 'meeting', meetingTitle, meetingId, additionalInfo);
}

export async function notifyClientCreated(
  creatorId: string,
  clientName: string,
  clientId: string,
  leadStatus?: string
): Promise<{ success: boolean; error?: string }> {
  const additionalInfo: Record<string, string> = {};
  if (leadStatus) additionalInfo['Lead Status'] = leadStatus;

  return notifyAdminsOfCreation(creatorId, 'client', clientName, clientId, additionalInfo);
}

export async function notifyIssueCreated(
  creatorId: string,
  issueTitle: string,
  issueId: string,
  priority?: string,
  projectName?: string
): Promise<{ success: boolean; error?: string }> {
  const additionalInfo: Record<string, string> = {};
  if (priority) additionalInfo['Priority'] = priority;
  if (projectName) additionalInfo['Project'] = projectName;

  return notifyAdminsOfCreation(creatorId, 'issue', issueTitle, issueId, additionalInfo);
}

// ============================================================================
// Phase Change Notifications (for client portal)
// ============================================================================

/**
 * Notify clients when a phase status changes to completed or blocked.
 * Only sends for significant status changes, not every update.
 */
export async function notifyClientsOfPhaseChange(
  projectId: string,
  phaseName: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resendClient = getResendClient();
    if (!resendClient) {
      console.warn('[notifyClientsOfPhaseChange] Resend not configured, skipping');
      return { success: true };
    }

    const supabase = await createClient();

    // Get project name
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single();

    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    // Get all clients for this project
    const { data: clientLinks } = await supabase
      .from('client_projects')
      .select('client_id')
      .eq('project_id', projectId);

    if (!clientLinks || clientLinks.length === 0) {
      return { success: true }; // No clients to notify
    }

    const clientIds = clientLinks.map((cl) => cl.client_id);

    // Get client emails
    const { data: clients } = await supabase
      .from('profiles')
      .select('email, full_name')
      .in('id', clientIds);

    if (!clients || clients.length === 0) {
      return { success: true };
    }

    const statusLabel = newStatus === 'completed' ? 'Completed' : 'Needs Attention';
    const portalUrl = `${APP_URL}/portal/${projectId}`;

    const emailPromises = clients
      .filter((c) => c.email)
      .map(async (client) => {
        const subject = `Phase Update: ${phaseName} — ${project.name}`;
        const recipientName = client.full_name || 'there';

        try {
          const { error } = await resendClient.emails.send({
            from: FROM_EMAIL,
            to: client.email!,
            subject,
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #00A4AC 0%, #008C93 100%); padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Qualia</h1>
  </div>
  <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 16px; color: #6b7280;">Hi ${recipientName},</p>
    <p style="margin: 0 0 24px; font-size: 16px;">
      The <strong>${phaseName}</strong> phase for <strong>${project.name}</strong> is now <strong>${statusLabel}</strong>.
    </p>
    <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #00A4AC 0%, #008C93 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
      View Project
    </a>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
      This notification was sent from Qualia. You're receiving this because you have access to this project.
    </p>
  </div>
</body>
</html>`.trim(),
            text: `Hi ${recipientName},\n\nThe ${phaseName} phase for ${project.name} is now ${statusLabel}.\n\nView your project: ${portalUrl}\n\n---\nQualia`,
          });

          if (error) {
            console.error(`[notifyClientsOfPhaseChange] Failed to send to ${client.email}:`, error);
          }
        } catch (err) {
          console.error(`[notifyClientsOfPhaseChange] Exception sending to ${client.email}:`, err);
        }
      });

    await Promise.all(emailPromises);
    return { success: true };
  } catch (error) {
    console.error('[notifyClientsOfPhaseChange] Unexpected error:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// Daily Reminder Functions (stub implementations for cron job)
// ============================================================================

type TaskForReminder = {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  assignee: { email: string; name: string } | null;
};

type TasksByAssignee = Map<
  string,
  {
    email: string;
    name: string;
    overdue: TaskForReminder[];
    upcoming: TaskForReminder[];
  }
>;

/**
 * Get tasks for daily reminders (stub - returns empty map)
 * TODO: Implement actual task fetching logic
 */
export async function getTasksForReminders(): Promise<{
  tasksByAssignee: TasksByAssignee;
}> {
  // Stub implementation - returns empty map
  // TODO: Implement actual logic to fetch tasks from database
  return { tasksByAssignee: new Map() };
}

/**
 * Send daily digest email (stub - returns success)
 * TODO: Implement actual email sending logic
 */
export async function sendDailyDigest(
  email: string,
  name: string,
  overdue: TaskForReminder[],
  upcoming: TaskForReminder[]
): Promise<{ success: boolean; error?: string }> {
  // Stub implementation - returns success without sending
  // TODO: Implement actual email sending logic
  void email;
  void name;
  void overdue;
  void upcoming;
  console.log('[sendDailyDigest] Stub implementation - email not sent');
  return { success: true };
}
