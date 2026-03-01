export interface ActivityLogEntry {
  id: string;
  project_id: string;
  action_type: string;
  actor_id: string;
  action_data: Record<string, unknown> | null;
  is_client_visible: boolean | null;
  created_at: string | null;
  actor?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
}

/**
 * Format activity message for display
 * Maps action_type to human-readable messages
 */
export function formatActivityMessage(entry: ActivityLogEntry): string {
  const { action_type, action_data } = entry;

  switch (action_type) {
    case 'phase_completed':
      return `Phase "${action_data?.phase_name || 'Unknown'}" completed`;

    case 'file_uploaded':
      return `File "${action_data?.file_name || 'Unknown'}" uploaded`;

    case 'comment_added':
      return `Comment added on ${action_data?.phase_name || 'phase'}`;

    case 'project_created':
      return 'Project created';

    case 'client_invited':
      return 'Client access granted';

    case 'phase_started':
      return `Phase "${action_data?.phase_name || 'Unknown'}" started`;

    case 'phase_review_requested':
      return `Review requested for phase "${action_data?.phase_name || 'Unknown'}"`;

    case 'phase_approved':
      return `Phase "${action_data?.phase_name || 'Unknown'}" approved`;

    case 'phase_changes_requested':
      return `Changes requested for phase "${action_data?.phase_name || 'Unknown'}"`;

    default:
      return `Activity: ${action_type.replace(/_/g, ' ')}`;
  }
}
