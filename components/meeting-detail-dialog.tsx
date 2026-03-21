'use client';

import { format, parseISO, differenceInMinutes } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Video, Clock, CalendarDays, FolderOpen, Pencil, ExternalLink, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTimezone } from '@/lib/schedule-utils';
import { RichText } from '@/components/ui/rich-text';
import type { MeetingWithRelations } from '@/lib/swr';

interface MeetingDetailDialogProps {
  meeting: MeetingWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (meeting: MeetingWithRelations) => void;
}

export function MeetingDetailDialog({
  meeting,
  open,
  onOpenChange,
  onEdit,
}: MeetingDetailDialogProps) {
  const { timezone } = useTimezone();

  if (!meeting) return null;

  const startTime = toZonedTime(parseISO(meeting.start_time), timezone);
  const endTime = toZonedTime(parseISO(meeting.end_time), timezone);
  const durationMins = differenceInMinutes(endTime, startTime);
  const durationLabel =
    durationMins >= 60
      ? `${Math.floor(durationMins / 60)}h${durationMins % 60 ? ` ${durationMins % 60}m` : ''}`
      : `${durationMins}m`;

  const client = meeting.client as { display_name?: string } | null;
  const project = Array.isArray(meeting.project) ? meeting.project[0] : meeting.project;
  const attendees = meeting.attendees || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden border-border bg-card p-0 sm:max-w-[440px]"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{meeting.title}</DialogTitle>
        {/* Header */}
        <div className="px-6 pb-4 pt-6">
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
              <Video className="size-4 text-violet-500" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold leading-snug text-foreground">
                {meeting.title}
              </h2>
              {client?.display_name && (
                <p className="mt-0.5 text-sm text-muted-foreground">{client.display_name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-3 border-t border-border/50 px-6 py-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="size-3.5 shrink-0" />
              <span>{format(startTime, 'EEE, MMM d')}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="size-3.5 shrink-0" />
              <span>
                {format(startTime, 'h:mm a')} – {format(endTime, 'h:mm a')}
                <span className="ml-1 text-muted-foreground/50">({durationLabel})</span>
              </span>
            </div>
          </div>

          {project && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FolderOpen className="size-3.5 shrink-0" />
              <span>{(project as { name: string }).name}</span>
            </div>
          )}

          {attendees.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="size-3.5 shrink-0" />
              <span>
                {attendees
                  .map((a) => {
                    const profile = Array.isArray(a.profile) ? a.profile[0] : a.profile;
                    return profile?.full_name || profile?.email || 'Unknown';
                  })
                  .join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        {meeting.description && (
          <div className="border-t border-border/50 px-6 py-4">
            <RichText className="text-foreground/80">{meeting.description}</RichText>
          </div>
        )}

        {/* Meeting Link */}
        {meeting.meeting_link && (
          <div className="border-t border-border/50 px-6 py-4">
            <a
              href={meeting.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
            >
              <ExternalLink className="size-3.5" />
              Join Meeting
            </a>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 border-t border-border/50 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onEdit(meeting);
            }}
            className="gap-1.5"
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
