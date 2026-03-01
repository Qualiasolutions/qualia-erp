'use client';

import { useState, useEffect, useTransition } from 'react';
import { AnimatePresence } from 'framer-motion';
import { TaskInstructionCard } from './task-instruction-card';
import { togglePhaseTask } from '@/app/actions/pipeline';
import { createClient } from '@/lib/supabase/client';

interface PhaseItem {
  id: string;
  title: string;
  description: string | null;
  helper_text: string | null;
  template_key: string | null;
  is_completed: boolean;
  display_order: number;
}

interface PhaseTasksProps {
  phaseId: string;
  phaseName: string;
  projectId: string;
  workspaceId: string;
  tasks: unknown[]; // Legacy prop, not used anymore
  onTasksChange: () => void;
  compact?: boolean;
}

export function PhaseTasks({ phaseId, onTasksChange, compact = false }: PhaseTasksProps) {
  const [phaseItems, setPhaseItems] = useState<PhaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Fetch phase_items for this phase
  useEffect(() => {
    let cancelled = false;

    async function fetchPhaseItems() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('phase_items')
        .select('id, title, description, helper_text, template_key, is_completed, display_order')
        .eq('phase_id', phaseId)
        .order('display_order', { ascending: true });

      if (!cancelled) {
        if (error) {
          console.error('[PhaseTasks] Error fetching phase_items:', error);
          setPhaseItems([]);
        } else {
          setPhaseItems(data || []);
        }
        setIsLoading(false);
      }
    }

    fetchPhaseItems();

    return () => {
      cancelled = true;
    };
  }, [phaseId]);

  const handleToggle = (itemId: string, isCompleted: boolean) => {
    startTransition(async () => {
      const result = await togglePhaseTask(itemId, phaseId);
      if (result.success) {
        // Update local state optimistically
        setPhaseItems((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, is_completed: !isCompleted } : item))
        );
        // Notify parent to refresh overall progress
        onTasksChange();
      }
    });
  };

  // Sort: incomplete first, then by display_order
  const sortedItems = [...phaseItems].sort((a, b) => {
    if (a.is_completed && !b.is_completed) return 1;
    if (!a.is_completed && b.is_completed) return -1;
    return a.display_order - b.display_order;
  });

  // Compact mode for dashboard widgets
  if (compact && phaseItems.length === 0) {
    return <p className="text-xs text-muted-foreground">No tasks defined for this phase yet.</p>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Task List - using TaskInstructionCard for phase_items */}
      <AnimatePresence mode="popLayout">
        {sortedItems.map((item) => (
          <TaskInstructionCard
            key={item.id}
            phaseItem={item}
            onToggle={handleToggle}
            disabled={isPending}
          />
        ))}
      </AnimatePresence>

      {/* Empty state */}
      {!compact && phaseItems.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No tasks defined for this phase. Tasks are created from GSD templates.
        </p>
      )}
    </div>
  );
}
