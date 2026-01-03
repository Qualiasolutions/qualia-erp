'use client';

import * as React from 'react';
import { useEffect, useRef, useState, useMemo } from 'react';
import { TIME_BLOCKS, getCurrentBlockId, getBlockById } from '@/lib/schedule-constants';
import {
  getTasksForBlocks,
  getMeetingsInBlock,
  getScheduleTimePosition,
  getBlockProgress,
} from '@/lib/schedule-utils';
import { TimeBlockRow } from './time-block-row';
import type { Task } from '@/app/actions/inbox';

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  meeting_link?: string | null;
  project?: { id: string; name: string } | null;
  client?: { id: string; display_name: string } | null;
}

interface TimeBlockGridProps {
  tasks: Task[];
  meetings: Meeting[];
  onTaskComplete?: (taskId: string) => void;
  onTaskClick?: (task: Task) => void;
  onMeetingClick?: (meeting: Meeting) => void;
  onStartTimer?: (blockId: string) => void;
}

export function TimeBlockGrid({
  tasks,
  meetings,
  onTaskComplete,
  onTaskClick,
  onMeetingClick,
  onStartTimer,
}: TimeBlockGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [timePosition, setTimePosition] = useState(0);

  // Update current block and progress every minute
  useEffect(() => {
    const updateTime = () => {
      const blockId = getCurrentBlockId();
      setCurrentBlockId(blockId);
      setTimePosition(getScheduleTimePosition());

      if (blockId) {
        const block = getBlockById(blockId);
        if (block) {
          setCurrentProgress(getBlockProgress(block));
        }
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to current block on mount
  useEffect(() => {
    if (currentBlockId && gridRef.current) {
      const blockElement = gridRef.current.querySelector(`[data-block-id="${currentBlockId}"]`);
      if (blockElement) {
        blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentBlockId]);

  // Distribute tasks across focus blocks
  const tasksByBlock = useMemo(() => {
    return getTasksForBlocks(tasks, 3);
  }, [tasks]);

  // Group meetings by block
  const meetingsByBlock = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const block of TIME_BLOCKS) {
      const blockMeetings = getMeetingsInBlock(meetings, block);
      if (blockMeetings.length > 0) {
        map.set(block.id, blockMeetings);
      }
    }
    return map;
  }, [meetings]);

  return (
    <div ref={gridRef} className="relative space-y-3">
      {/* Current time indicator */}
      {timePosition > 0 && timePosition < 100 && (
        <div
          className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
          style={{ top: `${timePosition}%` }}
        >
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <div className="h-0.5 flex-1 bg-red-500" />
        </div>
      )}

      {/* Time blocks */}
      {TIME_BLOCKS.map((block) => (
        <div key={block.id} data-block-id={block.id}>
          <TimeBlockRow
            block={block}
            tasks={tasksByBlock.get(block.id) || []}
            meetings={meetingsByBlock.get(block.id) || []}
            isActive={block.id === currentBlockId}
            progress={block.id === currentBlockId ? currentProgress : 0}
            onTaskComplete={onTaskComplete}
            onTaskClick={onTaskClick}
            onMeetingClick={onMeetingClick}
            onStartTimer={onStartTimer}
          />
        </div>
      ))}

      {/* Empty state */}
      {tasks.length === 0 && meetings.length === 0 && (
        <div className="rounded-lg border border-dashed border-muted-foreground/20 py-8 text-center">
          <p className="text-sm text-muted-foreground">No tasks or meetings scheduled for today</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Tasks due today will appear automatically
          </p>
        </div>
      )}
    </div>
  );
}
