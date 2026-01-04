'use client';

import { memo, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Circle, Clock, Calendar, Folder, Users, Video, RefreshCw, Eye } from 'lucide-react';
import type { Task } from '@/app/actions/inbox';
import type { DailyMeeting } from '@/app/actions/daily-flow';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  meetings: DailyMeeting[];
  onTaskSelect?: (task: Task) => void;
  onRefresh?: () => void;
  onToggleFocus?: () => void;
  onStartMeeting?: () => void;
}

/**
 * Command Palette - Linear/Raycast inspired
 * Quick access to tasks, navigation, and actions
 */
export const CommandPalette = memo(function CommandPalette({
  open,
  onOpenChange,
  tasks,
  meetings,
  onTaskSelect,
  onRefresh,
  onToggleFocus,
  onStartMeeting,
}: CommandPaletteProps) {
  const router = useRouter();

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Filter active tasks (Todo + In Progress)
  const activeTasks = useMemo(() => {
    return tasks.filter((t) => t.status === 'Todo' || t.status === 'In Progress').slice(0, 5);
  }, [tasks]);

  // Today's meetings
  const todaysMeetings = useMemo(() => {
    return meetings.slice(0, 3);
  }, [meetings]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              onStartMeeting?.();
              handleClose();
            }}
          >
            <Video className="mr-2 h-4 w-4" />
            Start new meeting
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onRefresh?.();
              handleClose();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh data
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onToggleFocus?.();
              handleClose();
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            Toggle focus mode
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Tasks */}
        {activeTasks.length > 0 && (
          <CommandGroup heading="Tasks">
            {activeTasks.map((task) => (
              <CommandItem
                key={task.id}
                onSelect={() => {
                  onTaskSelect?.(task);
                  handleClose();
                }}
              >
                {task.status === 'In Progress' ? (
                  <Clock className="mr-2 h-4 w-4 text-qualia-500" />
                ) : (
                  <Circle className="mr-2 h-4 w-4" />
                )}
                <span className="flex-1 truncate">{task.title}</span>
                {task.project && (
                  <span className="text-xs text-muted-foreground">{task.project.name}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Meetings */}
        {todaysMeetings.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Meetings">
              {todaysMeetings.map((meeting) => (
                <CommandItem
                  key={meeting.id}
                  onSelect={() => {
                    if (meeting.meeting_link) {
                      window.open(meeting.meeting_link, '_blank');
                    }
                    handleClose();
                  }}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  <span className="flex-1 truncate">{meeting.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(meeting.start_time).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => {
              router.push('/');
              handleClose();
            }}
          >
            <Circle className="mr-2 h-4 w-4" />
            Today
          </CommandItem>
          <CommandItem
            onSelect={() => {
              router.push('/projects');
              handleClose();
            }}
          >
            <Folder className="mr-2 h-4 w-4" />
            Projects
          </CommandItem>
          <CommandItem
            onSelect={() => {
              router.push('/clients');
              handleClose();
            }}
          >
            <Users className="mr-2 h-4 w-4" />
            Clients
          </CommandItem>
          <CommandItem
            onSelect={() => {
              router.push('/schedule');
              handleClose();
            }}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Schedule
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
});

export default CommandPalette;
