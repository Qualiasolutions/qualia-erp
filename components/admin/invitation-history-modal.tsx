'use client';

import { useEffect, useState } from 'react';
import { getInvitationHistory, resendInvitation } from '@/app/actions/client-invitations';
import { sendClientInvitation } from '@/lib/email';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Mail, RefreshCw, Eye, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type InvitationRecord = {
  id: string;
  email: string;
  status: 'sent' | 'resent' | 'opened' | 'accepted';
  invited_at: string;
  resent_at?: string | null;
  resent_count?: number | null;
  opened_at?: string | null;
  account_created_at?: string | null;
  invited_by_user?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  invitation_token?: string;
};

type ProjectForImport = {
  id: string;
  name: string;
  invitationId?: string;
  invitedEmail?: string;
  invitationStatus?: 'sent' | 'resent' | 'opened' | 'accepted';
  invitedAt?: string;
  resentCount?: number;
  metadata?: {
    portal_settings?: {
      welcome_message?: string;
    };
  };
};

type InvitationHistoryModalProps = {
  project: ProjectForImport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function InvitationHistoryModal({
  project,
  open,
  onOpenChange,
  onSuccess,
}: InvitationHistoryModalProps) {
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Fetch invitation history when modal opens
  useEffect(() => {
    if (open && project?.id) {
      fetchHistory();
    }
  }, [open, project?.id]);

  const fetchHistory = async () => {
    if (!project?.id) return;

    setIsLoading(true);
    try {
      const result = await getInvitationHistory(project.id);
      if (result.success && Array.isArray(result.data)) {
        setInvitations(result.data as InvitationRecord[]);
      } else {
        toast.error(result.error || 'Failed to load invitation history');
      }
    } catch (error) {
      console.error('[InvitationHistoryModal] Error fetching history:', error);
      toast.error('Failed to load invitation history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!project?.invitationId) {
      toast.error('No invitation to resend');
      return;
    }

    const currentInvitation = invitations[0]; // Most recent invitation
    if (!currentInvitation) {
      toast.error('No invitation found');
      return;
    }

    setIsResending(true);
    try {
      // Update invitation status in database
      const result = await resendInvitation(project.invitationId);

      if (!result.success) {
        toast.error(result.error || 'Failed to resend invitation');
        return;
      }

      // Send email with invitation token
      await sendClientInvitation({
        projectId: project.id,
        projectName: project.name,
        email: currentInvitation.email,
        invitationToken: currentInvitation.invitation_token || '',
        welcomeMessage: project.metadata?.portal_settings?.welcome_message,
      });

      toast.success(`Invitation resent to ${currentInvitation.email}`);

      // Refresh history to show updated status
      await fetchHistory();

      // Notify parent to refresh project list
      onSuccess();
    } catch (error) {
      console.error('[InvitationHistoryModal] Error resending invitation:', error);
      toast.error('Failed to resend invitation');
    } finally {
      setIsResending(false);
    }
  };

  if (!project) return null;

  const latestInvitation = invitations[0];
  const canResend = latestInvitation && ['sent', 'resent'].includes(latestInvitation.status);

  // Get status badge configuration
  const getStatusBadge = (
    status: 'sent' | 'resent' | 'opened' | 'accepted'
  ): {
    label: string;
    bgColor: string;
    textColor: string;
    icon: typeof Mail;
  } => {
    const configs = {
      sent: {
        label: 'Invited',
        bgColor: 'bg-blue-500/10',
        textColor: 'text-blue-600',
        icon: Mail,
      },
      resent: {
        label: 'Reminder Sent',
        bgColor: 'bg-purple-500/10',
        textColor: 'text-purple-600',
        icon: RefreshCw,
      },
      opened: {
        label: 'Link Opened',
        bgColor: 'bg-amber-500/10',
        textColor: 'text-amber-600',
        icon: Eye,
      },
      accepted: {
        label: 'Account Created',
        bgColor: 'bg-green-500/10',
        textColor: 'text-green-600',
        icon: CheckCircle,
      },
    };

    return configs[status];
  };

  // Get event details for timeline
  const getTimelineEvents = () => {
    const events: Array<{
      type: 'sent' | 'resent' | 'opened' | 'accepted';
      timestamp: string;
      userName: string;
    }> = [];

    invitations.forEach((inv) => {
      // Initial send
      events.push({
        type: 'sent',
        timestamp: inv.invited_at,
        userName: inv.invited_by_user?.full_name || inv.invited_by_user?.email || 'Unknown',
      });

      // Resend events
      if (inv.resent_at && inv.status === 'resent') {
        events.push({
          type: 'resent',
          timestamp: inv.resent_at,
          userName: inv.invited_by_user?.full_name || inv.invited_by_user?.email || 'Unknown',
        });
      }

      // Opened event
      if (inv.opened_at) {
        events.push({
          type: 'opened',
          timestamp: inv.opened_at,
          userName: inv.email,
        });
      }

      // Accepted event
      if (inv.account_created_at) {
        events.push({
          type: 'accepted',
          timestamp: inv.account_created_at,
          userName: inv.email,
        });
      }
    });

    // Sort by timestamp DESC (most recent first)
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const timelineEvents = getTimelineEvents();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invitation History - {project.name}</DialogTitle>
          <DialogDescription>
            View all invitation events and resend invitations as needed.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#00A4AC]" />
          </div>
        ) : invitations.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No invitation sent yet. Use the &quot;Send Invitation&quot; button to invite a client
              to this project.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Current status card */}
            {latestInvitation && (
              <Card className="border-[#00A4AC]/20 bg-[#00A4AC]/5 p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Current Status</p>
                      <p className="text-xs text-muted-foreground">{latestInvitation.email}</p>
                    </div>
                    <Badge
                      className={`gap-1.5 ${
                        getStatusBadge(latestInvitation.status).bgColor
                      } ${getStatusBadge(latestInvitation.status).textColor}`}
                    >
                      {(() => {
                        const IconComponent = getStatusBadge(latestInvitation.status).icon;
                        return <IconComponent className="h-3 w-3" />;
                      })()}
                      {getStatusBadge(latestInvitation.status).label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Last activity:{' '}
                      {formatDistanceToNow(new Date(latestInvitation.invited_at), {
                        addSuffix: true,
                      })}
                    </span>
                    {latestInvitation.resent_count && latestInvitation.resent_count > 0 && (
                      <span>Resent {latestInvitation.resent_count}x</span>
                    )}
                  </div>

                  {canResend && (
                    <Button
                      onClick={handleResend}
                      disabled={isResending}
                      className="w-full bg-[#00A4AC] hover:bg-[#00A4AC]/90"
                      size="sm"
                    >
                      {isResending ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Resending...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-3.5 w-3.5" />
                          Resend Invitation
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Timeline */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Timeline</p>
              <div className="space-y-0 border-l-2 border-border pl-4">
                {timelineEvents.map((event, idx) => {
                  const config = getStatusBadge(event.type);
                  const IconComponent = config.icon;

                  return (
                    <div key={idx} className="relative pb-6 last:pb-0">
                      {/* Icon circle */}
                      <div
                        className={`absolute -left-[25px] flex h-8 w-8 items-center justify-center rounded-full border-2 border-background ${config.bgColor}`}
                      >
                        <IconComponent className={`h-4 w-4 ${config.textColor}`} />
                      </div>

                      {/* Event details */}
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{config.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.userName} •{' '}
                          {formatDistanceToNow(new Date(event.timestamp), {
                            addSuffix: true,
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
