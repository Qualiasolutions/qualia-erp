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
// Phase Review Notifications (for trainee workflow)
// ============================================================================

/**
 * Notify admins when a trainee submits a phase for review
 */
export async function notifyPhaseSubmitted(
  projectId: string,
  projectName: string,
  phaseName: string,
  submittedByName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resendClient = getResendClient();
    if (!resendClient) {
      console.warn('[notifyPhaseSubmitted] Resend not configured');
      return { success: true };
    }

    const supabase = await createClient();

    // Get all admin users
    const { data: admins } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('role', 'admin');

    if (!admins || admins.length === 0) return { success: true };

    const reviewUrl = `${APP_URL}/projects`;

    const emailPromises = admins
      .filter((admin) => admin.email)
      .map(async (admin) => {
        const subject = `Phase Review Needed: ${phaseName} — ${projectName}`;
        const recipientName = admin.full_name || 'Admin';

        try {
          const { error } = await resendClient.emails.send({
            from: FROM_EMAIL,
            to: admin.email!,
            subject,
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Qualia Platform</h1>
  </div>
  <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 16px; color: #6b7280;">Hi ${recipientName},</p>
    <p style="margin: 0 0 24px; font-size: 16px;">
      <strong>${submittedByName}</strong> has submitted the <strong>${phaseName}</strong> phase of <strong>${projectName}</strong> for review.
    </p>
    <a href="${reviewUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
      Review Now
    </a>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
      This notification was sent from the Qualia Platform.
    </p>
  </div>
</body>
</html>`.trim(),
            text: `Hi ${recipientName},\n\n${submittedByName} has submitted the ${phaseName} phase of ${projectName} for review.\n\nReview it here: ${reviewUrl}\n\n---\nQualia Platform`,
          });

          if (error) {
            console.error(`[notifyPhaseSubmitted] Failed to send to ${admin.email}:`, error);
          }
        } catch (err) {
          console.error(`[notifyPhaseSubmitted] Exception sending to ${admin.email}:`, err);
        }
      });

    await Promise.all(emailPromises);
    return { success: true };
  } catch (error) {
    console.error('[notifyPhaseSubmitted] Unexpected error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Notify trainee when admin approves their phase
 */
export async function notifyPhaseApproved(
  projectId: string,
  projectName: string,
  phaseName: string,
  traineeId: string,
  reviewedByName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resendClient = getResendClient();
    if (!resendClient) {
      console.warn('[notifyPhaseApproved] Resend not configured');
      return { success: true };
    }

    const supabase = await createClient();

    const { data: trainee } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', traineeId)
      .single();

    if (!trainee || !trainee.email) return { success: true };

    const projectUrl = `${APP_URL}/projects/${projectId}`;
    const recipientName = trainee.full_name || 'there';
    const subject = `Phase Approved: ${phaseName} — ${projectName}`;

    const { error } = await resendClient.emails.send({
      from: FROM_EMAIL,
      to: trainee.email,
      subject,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Phase Approved</h1>
  </div>
  <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 16px; color: #6b7280;">Hi ${recipientName},</p>
    <p style="margin: 0 0 24px; font-size: 16px;">
      Great work! <strong>${reviewedByName}</strong> has approved the <strong>${phaseName}</strong> phase of <strong>${projectName}</strong>.
    </p>
    <p style="margin: 0 0 24px; color: #6b7280;">You can now proceed to the next phase.</p>
    <a href="${projectUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
      View Project
    </a>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
      This notification was sent from the Qualia Platform.
    </p>
  </div>
</body>
</html>`.trim(),
      text: `Hi ${recipientName},\n\nGreat work! ${reviewedByName} has approved the ${phaseName} phase of ${projectName}.\n\nYou can now proceed to the next phase.\n\nView project: ${projectUrl}\n\n---\nQualia Platform`,
    });

    if (error) {
      console.error('[notifyPhaseApproved] Failed to send email:', error);
      return { success: false, error: String(error) };
    }

    return { success: true };
  } catch (error) {
    console.error('[notifyPhaseApproved] Unexpected error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Notify trainee when admin requests changes on their phase
 */
export async function notifyPhaseChangesRequested(
  projectId: string,
  projectName: string,
  phaseName: string,
  traineeId: string,
  reviewedByName: string,
  feedback: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resendClient = getResendClient();
    if (!resendClient) {
      console.warn('[notifyPhaseChangesRequested] Resend not configured');
      return { success: true };
    }

    const supabase = await createClient();

    const { data: trainee } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', traineeId)
      .single();

    if (!trainee || !trainee.email) return { success: true };

    const projectUrl = `${APP_URL}/projects/${projectId}`;
    const recipientName = trainee.full_name || 'there';
    const subject = `Changes Requested: ${phaseName} — ${projectName}`;

    const { error } = await resendClient.emails.send({
      from: FROM_EMAIL,
      to: trainee.email,
      subject,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Changes Requested</h1>
  </div>
  <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 16px; color: #6b7280;">Hi ${recipientName},</p>
    <p style="margin: 0 0 24px; font-size: 16px;">
      <strong>${reviewedByName}</strong> has requested changes on the <strong>${phaseName}</strong> phase of <strong>${projectName}</strong>.
    </p>
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0;">
      <h3 style="margin: 0 0 8px; color: #92400e; font-size: 14px; font-weight: 600;">Feedback:</h3>
      <p style="margin: 0; color: #78350f; white-space: pre-wrap;">${feedback}</p>
    </div>
    <a href="${projectUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
      View Project
    </a>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
      This notification was sent from the Qualia Platform.
    </p>
  </div>
</body>
</html>`.trim(),
      text: `Hi ${recipientName},\n\n${reviewedByName} has requested changes on the ${phaseName} phase of ${projectName}.\n\nFeedback:\n${feedback}\n\nView project: ${projectUrl}\n\n---\nQualia Platform`,
    });

    if (error) {
      console.error('[notifyPhaseChangesRequested] Failed to send email:', error);
      return { success: false, error: String(error) };
    }

    return { success: true };
  } catch (error) {
    console.error('[notifyPhaseChangesRequested] Unexpected error:', error);
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

// ============================================================================
// Employee Notification Functions (Phase 14-02)
// ============================================================================

import { shouldSendEmail } from '@/app/actions/notification-preferences';
import { getProjectAssignedEmployees } from '@/lib/notifications';

/**
 * Notify assigned employees when a client comments on a project
 */
export async function notifyEmployeesOfClientComment(
  projectId: string,
  clientName: string,
  commentText: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resendClient = getResendClient();
    if (!resendClient) {
      console.warn('[notifyEmployeesOfClientComment] Resend not configured');
      return { success: true };
    }

    const supabase = await createClient();

    // Get project details
    const { data: project } = await supabase
      .from('projects')
      .select('name, workspace_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    // Get assigned employees
    const employeeIds = await getProjectAssignedEmployees(projectId);

    if (employeeIds.length === 0) {
      return { success: true }; // No employees to notify
    }

    // Get employee profiles
    const { data: employees } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', employeeIds);

    if (!employees || employees.length === 0) {
      return { success: true };
    }

    const viewUrl = `${APP_URL}/projects/${projectId}`;

    // Truncate comment if too long
    const commentPreview =
      commentText.length > 300 ? commentText.substring(0, 297) + '...' : commentText;

    const emailPromises = employees
      .filter((emp) => emp.email)
      .map(async (employee) => {
        // Check if employee wants email notifications for client comments
        const shouldSend = await shouldSendEmail(
          employee.id,
          project.workspace_id,
          'client_activity'
        );

        if (!shouldSend) {
          console.log(
            `[notifyEmployeesOfClientComment] Skipping email to ${employee.email} (preferences)`
          );
          return;
        }

        const subject = `${clientName} commented on ${project.name}`;
        const recipientName = employee.full_name || 'there';

        try {
          const { error } = await resendClient.emails.send({
            from: FROM_EMAIL,
            to: employee.email!,
            subject,
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #00A4AC 0%, #008C94 100%); padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">New Comment from Client</h1>
  </div>
  <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 16px; color: #6b7280;">Hi ${recipientName},</p>
    <p style="margin: 0 0 24px; font-size: 16px;">
      <strong>${clientName}</strong> left a comment on <strong>${project.name}</strong>:
    </p>
    <blockquote style="background: #f9fafb; border-left: 4px solid #00A4AC; padding: 16px; margin: 24px 0; white-space: pre-wrap;">
      ${commentPreview}
    </blockquote>
    <a href="${viewUrl}" style="display: inline-block; background: #00A4AC; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
      View Comment
    </a>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
      You're receiving this because you're assigned to this project. Manage notification preferences in Settings.
    </p>
  </div>
</body>
</html>`.trim(),
            text: `Hi ${recipientName},\n\n${clientName} left a comment on ${project.name}:\n\n${commentPreview}\n\nView comment: ${viewUrl}\n\n---\nManage preferences in Settings.`,
          });

          if (error) {
            console.error(
              `[notifyEmployeesOfClientComment] Failed to send to ${employee.email}:`,
              error
            );
          }
        } catch (err) {
          console.error(
            `[notifyEmployeesOfClientComment] Exception sending to ${employee.email}:`,
            err
          );
        }
      });

    await Promise.all(emailPromises);
    return { success: true };
  } catch (error) {
    console.error('[notifyEmployeesOfClientComment] Unexpected error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Notify assigned employees when a client uploads a file to a project
 */
export async function notifyEmployeesOfClientFileUpload(
  projectId: string,
  clientName: string,
  fileName: string,
  fileDescription?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resendClient = getResendClient();
    if (!resendClient) {
      console.warn('[notifyEmployeesOfClientFileUpload] Resend not configured');
      return { success: true };
    }

    const supabase = await createClient();

    // Get project details
    const { data: project } = await supabase
      .from('projects')
      .select('name, workspace_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    // Get assigned employees
    const employeeIds = await getProjectAssignedEmployees(projectId);

    if (employeeIds.length === 0) {
      return { success: true }; // No employees to notify
    }

    // Get employee profiles
    const { data: employees } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', employeeIds);

    if (!employees || employees.length === 0) {
      return { success: true };
    }

    const viewUrl = `${APP_URL}/projects/${projectId}/files`;

    const emailPromises = employees
      .filter((emp) => emp.email)
      .map(async (employee) => {
        // Check if employee wants email notifications for client file uploads
        const shouldSend = await shouldSendEmail(
          employee.id,
          project.workspace_id,
          'client_activity'
        );

        if (!shouldSend) {
          console.log(
            `[notifyEmployeesOfClientFileUpload] Skipping email to ${employee.email} (preferences)`
          );
          return;
        }

        const subject = `${clientName} uploaded a file to ${project.name}`;
        const recipientName = employee.full_name || 'there';

        try {
          const { error } = await resendClient.emails.send({
            from: FROM_EMAIL,
            to: employee.email!,
            subject,
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">New File from Client</h1>
  </div>
  <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 16px; color: #6b7280;">Hi ${recipientName},</p>
    <p style="margin: 0 0 24px; font-size: 16px;">
      <strong>${clientName}</strong> uploaded a file to <strong>${project.name}</strong>:
    </p>
    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0;">
      <p style="margin: 0;"><strong>File:</strong> ${fileName}</p>
      ${fileDescription ? `<p style="margin: 8px 0 0;"><strong>Description:</strong> ${fileDescription}</p>` : ''}
    </div>
    <a href="${viewUrl}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
      View File
    </a>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
      You're receiving this because you're assigned to this project. Manage notification preferences in Settings.
    </p>
  </div>
</body>
</html>`.trim(),
            text: `Hi ${recipientName},\n\n${clientName} uploaded a file to ${project.name}:\n\nFile: ${fileName}${fileDescription ? `\nDescription: ${fileDescription}` : ''}\n\nView file: ${viewUrl}\n\n---\nManage preferences in Settings.`,
          });

          if (error) {
            console.error(
              `[notifyEmployeesOfClientFileUpload] Failed to send to ${employee.email}:`,
              error
            );
          }
        } catch (err) {
          console.error(
            `[notifyEmployeesOfClientFileUpload] Exception sending to ${employee.email}:`,
            err
          );
        }
      });

    await Promise.all(emailPromises);
    return { success: true };
  } catch (error) {
    console.error('[notifyEmployeesOfClientFileUpload] Unexpected error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Notify assigned employees of generic client activity
 */
export async function notifyEmployeesOfClientActivity(
  projectId: string,
  clientName: string,
  activityType: string,
  activityDetails: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resendClient = getResendClient();
    if (!resendClient) {
      console.warn('[notifyEmployeesOfClientActivity] Resend not configured');
      return { success: true };
    }

    const supabase = await createClient();

    // Get project details
    const { data: project } = await supabase
      .from('projects')
      .select('name, workspace_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    // Get assigned employees
    const employeeIds = await getProjectAssignedEmployees(projectId);

    if (employeeIds.length === 0) {
      return { success: true }; // No employees to notify
    }

    // Get employee profiles
    const { data: employees } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', employeeIds);

    if (!employees || employees.length === 0) {
      return { success: true };
    }

    const viewUrl = `${APP_URL}/projects/${projectId}`;

    const emailPromises = employees
      .filter((emp) => emp.email)
      .map(async (employee) => {
        // Check if employee wants email notifications for client activity
        const shouldSend = await shouldSendEmail(
          employee.id,
          project.workspace_id,
          'client_activity'
        );

        if (!shouldSend) {
          console.log(
            `[notifyEmployeesOfClientActivity] Skipping email to ${employee.email} (preferences)`
          );
          return;
        }

        const subject = `${clientName} ${activityType} on ${project.name}`;
        const recipientName = employee.full_name || 'there';

        try {
          const { error } = await resendClient.emails.send({
            from: FROM_EMAIL,
            to: employee.email!,
            subject,
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Client Activity</h1>
  </div>
  <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 16px; color: #6b7280;">Hi ${recipientName},</p>
    <p style="margin: 0 0 24px; font-size: 16px;">
      <strong>${clientName}</strong> ${activityType} on <strong>${project.name}</strong>:
    </p>
    <div style="background: #f9fafb; border-left: 4px solid #6b7280; padding: 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; white-space: pre-wrap;">${activityDetails}</p>
    </div>
    <a href="${viewUrl}" style="display: inline-block; background: #6b7280; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
      View Project
    </a>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
      You're receiving this because you're assigned to this project. Manage notification preferences in Settings.
    </p>
  </div>
</body>
</html>`.trim(),
            text: `Hi ${recipientName},\n\n${clientName} ${activityType} on ${project.name}:\n\n${activityDetails}\n\nView project: ${viewUrl}\n\n---\nManage preferences in Settings.`,
          });

          if (error) {
            console.error(
              `[notifyEmployeesOfClientActivity] Failed to send to ${employee.email}:`,
              error
            );
          }
        } catch (err) {
          console.error(
            `[notifyEmployeesOfClientActivity] Exception sending to ${employee.email}:`,
            err
          );
        }
      });

    await Promise.all(emailPromises);
    return { success: true };
  } catch (error) {
    console.error('[notifyEmployeesOfClientActivity] Unexpected error:', error);
    return { success: false, error: String(error) };
  }
}
