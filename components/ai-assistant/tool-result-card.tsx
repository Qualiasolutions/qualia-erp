'use client';

import { CheckSquare, Receipt, Calendar, FolderKanban, UserCircle, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import {
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
  type TaskStatusKey,
  type TaskPriorityKey,
} from '@/lib/color-constants';

interface ToolResultCardProps {
  toolName: string;
  result: Record<string, unknown>;
}

/**
 * Renders visual cards for AI tool results
 * Used in chat widget to display structured data from AI agent tool executions
 */
export function ToolResultCard({ toolName, result }: ToolResultCardProps) {
  // Determine card type based on tool name
  const cardType = getCardType(toolName);

  switch (cardType) {
    case 'task':
      return <TaskCard result={result} />;
    case 'invoice':
      return <InvoiceCard result={result} />;
    case 'meeting':
      return <MeetingCard result={result} />;
    case 'project':
      return <ProjectCard result={result} />;
    case 'contact':
      return <ContactCard result={result} />;
    default:
      return <GenericCard toolName={toolName} result={result} />;
  }
}

/**
 * Determine card type from tool name
 */
function getCardType(toolName: string): string {
  const lower = toolName.toLowerCase();

  if (lower.includes('task') || lower.includes('todo')) return 'task';
  if (lower.includes('invoice') || lower.includes('payment')) return 'invoice';
  if (lower.includes('meeting') || lower.includes('calendar')) return 'meeting';
  if (lower.includes('project')) return 'project';
  if (lower.includes('contact') || lower.includes('zoho')) return 'contact';

  return 'generic';
}

/**
 * Task Card Component
 */
function TaskCard({ result }: { result: Record<string, unknown> }) {
  const status = (result.status as TaskStatusKey) || 'Todo';
  const priority = (result.priority as TaskPriorityKey) || 'No Priority';
  const statusColors = TASK_STATUS_COLORS[status] || TASK_STATUS_COLORS.Todo;
  const priorityColors = TASK_PRIORITY_COLORS[priority] || TASK_PRIORITY_COLORS['No Priority'];

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-3 backdrop-blur-sm">
      {/* Header */}
      <div className="mb-2 flex items-center gap-2 border-b border-border/30 pb-2">
        <CheckSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Task</span>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {/* Title */}
        {result.title != null && (
          <h4 className="text-sm font-medium leading-tight text-foreground">
            {String(result.title)}
          </h4>
        )}

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Badge */}
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
              statusColors.bg,
              statusColors.border,
              statusColors.text
            )}
          >
            {statusColors.label}
          </span>

          {/* Priority Badge */}
          {priority !== 'No Priority' && (
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                priorityColors.bg,
                priorityColors.border,
                priorityColors.text
              )}
            >
              {priorityColors.label}
            </span>
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-1 text-xs text-muted-foreground">
          {result.due_date != null && (
            <div>
              Due: <span className="text-foreground">{formatDate(String(result.due_date))}</span>
            </div>
          )}
          {result.assigned_to != null && (
            <div>
              Assigned:{' '}
              <span className="text-foreground">
                {typeof result.assigned_to === 'object' && result.assigned_to !== null
                  ? String((result.assigned_to as Record<string, unknown>).full_name || 'Unknown')
                  : String(result.assigned_to)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Invoice Card Component
 */
function InvoiceCard({ result }: { result: Record<string, unknown> }) {
  const status = String(result.status || 'draft').toLowerCase();
  const statusColors = getInvoiceStatusColors(status);

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-3 backdrop-blur-sm">
      {/* Header */}
      <div className="mb-2 flex items-center gap-2 border-b border-border/30 pb-2">
        <Receipt className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Invoice</span>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {/* Invoice Number & Total */}
        <div className="flex items-baseline justify-between">
          {result.invoice_number != null && (
            <span className="text-xs font-medium text-muted-foreground">
              #{String(result.invoice_number)}
            </span>
          )}
          {result.total != null && (
            <span className="text-lg font-semibold text-foreground">
              ${formatCurrency(result.total)}
            </span>
          )}
        </div>

        {/* Client Name */}
        {result.client_name != null && (
          <div className="text-sm font-medium text-foreground">{String(result.client_name)}</div>
        )}

        {/* Status Badge */}
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
            statusColors.bg,
            statusColors.border,
            statusColors.text
          )}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>

        {/* Due Date */}
        {result.due_date != null && (
          <div className="text-xs text-muted-foreground">
            Due: <span className="text-foreground">{formatDate(String(result.due_date))}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Meeting Card Component
 */
function MeetingCard({ result }: { result: Record<string, unknown> }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-3 backdrop-blur-sm">
      {/* Header */}
      <div className="mb-2 flex items-center gap-2 border-b border-border/30 pb-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Meeting</span>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {/* Title */}
        {result.title != null && (
          <h4 className="text-sm font-medium leading-tight text-foreground">
            {String(result.title)}
          </h4>
        )}

        {/* Date & Time */}
        {(result.date != null || result.start_time != null) && (
          <div className="text-xs text-muted-foreground">
            {result.date != null && (
              <span className="text-foreground">{formatDate(String(result.date))}</span>
            )}
            {result.start_time != null && (
              <span className="ml-1 text-foreground">at {String(result.start_time)}</span>
            )}
          </div>
        )}

        {/* Attendees */}
        {result.attendees != null && (
          <div className="text-xs text-muted-foreground">
            Attendees:{' '}
            <span className="text-foreground">
              {Array.isArray(result.attendees)
                ? result.attendees.map((a) => String(a)).join(', ')
                : String(result.attendees)}
            </span>
          </div>
        )}

        {/* Meeting Link */}
        {result.meeting_link != null && (
          <a
            href={String(result.meeting_link)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs text-blue-500 hover:underline"
          >
            Join Meeting →
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Project Card Component
 */
function ProjectCard({ result }: { result: Record<string, unknown> }) {
  const status = String(result.status || 'Active');
  const statusColors = getProjectStatusColors(status);

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-3 backdrop-blur-sm">
      {/* Header */}
      <div className="mb-2 flex items-center gap-2 border-b border-border/30 pb-2">
        <FolderKanban className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Project</span>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {/* Project Name */}
        {result.name != null && (
          <h4 className="text-sm font-medium leading-tight text-foreground">
            {String(result.name)}
          </h4>
        )}

        {/* Status Badge */}
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
            statusColors.bg,
            statusColors.border,
            statusColors.text
          )}
        >
          {status}
        </span>

        {/* Metadata */}
        <div className="space-y-1 text-xs text-muted-foreground">
          {result.client_name != null && (
            <div>
              Client: <span className="text-foreground">{String(result.client_name)}</span>
            </div>
          )}
          {result.project_type != null && (
            <div>
              Type:{' '}
              <span className="text-foreground">
                {formatProjectType(String(result.project_type))}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Contact Card Component
 */
function ContactCard({ result }: { result: Record<string, unknown> }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-3 backdrop-blur-sm">
      {/* Header */}
      <div className="mb-2 flex items-center gap-2 border-b border-border/30 pb-2">
        <UserCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Contact</span>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {/* Name */}
        {result.name != null && (
          <h4 className="text-sm font-medium leading-tight text-foreground">
            {String(result.name)}
          </h4>
        )}

        {/* Contact Details */}
        <div className="space-y-1 text-xs text-muted-foreground">
          {result.email != null && (
            <div>
              Email: <span className="text-foreground">{String(result.email)}</span>
            </div>
          )}
          {result.phone != null && (
            <div>
              Phone: <span className="text-foreground">{String(result.phone)}</span>
            </div>
          )}
          {result.company != null && (
            <div>
              Company: <span className="text-foreground">{String(result.company)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Generic Card Component (fallback for unknown tool types)
 */
function GenericCard({ toolName, result }: { toolName: string; result: Record<string, unknown> }) {
  // Filter out null/undefined values
  const entries = Object.entries(result).filter(([, value]) => value != null);

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-3 backdrop-blur-sm">
      {/* Header */}
      <div className="mb-2 flex items-center gap-2 border-b border-border/30 pb-2">
        <Wrench className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          {formatToolName(toolName)}
        </span>
      </div>

      {/* Content */}
      <div className="space-y-1.5">
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data available</p>
        ) : (
          entries.map(([key, value]) => (
            <div key={key} className="flex items-start gap-2 text-xs">
              <span className="shrink-0 font-medium text-muted-foreground">{formatKey(key)}:</span>
              <span className="text-foreground">{formatValue(value)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Helper Functions

/**
 * Format currency value
 */
function formatCurrency(value: unknown): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(num) ? String(value) : num.toLocaleString('en-US', { minimumFractionDigits: 2 });
}

/**
 * Get invoice status colors
 */
function getInvoiceStatusColors(status: string) {
  switch (status) {
    case 'paid':
      return {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'sent':
      return {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-600 dark:text-blue-400',
      };
    case 'overdue':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-600 dark:text-red-400',
      };
    default: // draft
      return {
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/30',
        text: 'text-slate-600 dark:text-slate-400',
      };
  }
}

/**
 * Get project status colors
 */
function getProjectStatusColors(status: string) {
  switch (status) {
    case 'Active':
    case 'Launched':
      return {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'Demos':
      return {
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/30',
        text: 'text-purple-600 dark:text-purple-400',
      };
    case 'Delayed':
    case 'Canceled':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-600 dark:text-red-400',
      };
    default:
      return {
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/30',
        text: 'text-slate-600 dark:text-slate-400',
      };
  }
}

/**
 * Format project type for display
 */
function formatProjectType(type: string): string {
  const typeMap: Record<string, string> = {
    web_design: 'Web Design',
    ai_agent: 'AI Agent',
    voice_agent: 'Voice Agent',
    seo: 'SEO',
    ads: 'Ads',
  };
  return typeMap[type] || type;
}

/**
 * Format tool name for display
 */
function formatToolName(toolName: string): string {
  return toolName
    .split(/(?=[A-Z])|_|-/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format object key for display
 */
function formatKey(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format value for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map((v) => String(v)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Helper function to detect if a message contains a tool result
 * @param content - Message content string
 * @returns Parsed tool result or null
 */
export function isToolResult(
  content: string
): { toolName: string; result: Record<string, unknown> } | null {
  // Try to detect JSON blocks first (```json ... ```)
  const jsonBlockMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
  if (jsonBlockMatch) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1]);
      if (parsed && typeof parsed === 'object') {
        // Try to extract tool name from context
        const toolNameMatch = content.match(/(?:called|executed|ran)\s+([a-zA-Z_]+)/i);
        return {
          toolName: toolNameMatch?.[1] || 'Tool',
          result: parsed,
        };
      }
    } catch {
      // Not valid JSON
    }
  }

  // Try to parse as raw JSON object
  try {
    const trimmed = content.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return {
          toolName: 'Tool',
          result: parsed,
        };
      }
    }
  } catch {
    // Not valid JSON
  }

  // Check for common tool result patterns
  const toolPatterns = [
    /Created task:\s*({[\s\S]*?})/i,
    /Invoice details:\s*({[\s\S]*?})/i,
    /Meeting scheduled:\s*({[\s\S]*?})/i,
    /Project info:\s*({[\s\S]*?})/i,
    /Contact found:\s*({[\s\S]*?})/i,
    /Tool result:\s*({[\s\S]*?})/i,
  ];

  for (const pattern of toolPatterns) {
    const match = content.match(pattern);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed && typeof parsed === 'object') {
          // Extract tool type from pattern
          const typeMatch = pattern.source.match(/^([^:]+)/);
          return {
            toolName: typeMatch?.[1] || 'Tool',
            result: parsed,
          };
        }
      } catch {
        // Not valid JSON
      }
    }
  }

  return null;
}
