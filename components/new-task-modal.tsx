'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  CalendarIcon,
  User,
  Users,
  FolderOpen,
  Sparkles,
  Check,
  X,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SelectWithOther } from '@/components/ui/select-with-other';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import { createTask } from '@/app/actions/inbox';
import { useProfiles, useProjects, invalidateInboxTasks, invalidateProjectTasks } from '@/lib/swr';
import { setHours, setMinutes, addMinutes } from 'date-fns';

interface NewTaskModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultAssigneeId?: string | null;
  defaultScheduledTime?: string | null; // Format: "H:mm" e.g. "9:00"
}

export function NewTaskModal({
  open: controlledOpen,
  onOpenChange,
  defaultAssigneeId,
  defaultScheduledTime,
}: NewTaskModalProps = {}) {
  const { profiles } = useProfiles();
  const { projects } = useProjects();
  const inputRef = useRef<HTMLInputElement>(null);

  // Form state - support both controlled and uncontrolled modes
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (v: boolean) => onOpenChange?.(v) : setInternalOpen;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [customProjectName, setCustomProjectName] = useState<string>('');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [duration, setDuration] = useState<string>('30');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setProjectId('');
      setCustomProjectName('');
      setAssigneeId(defaultAssigneeId || null);
      setDueDate(undefined);
      setScheduledTime(defaultScheduledTime || '');
      setDuration('60');
      setError(null);
      setSuccess(false);
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, defaultAssigneeId, defaultScheduledTime]);

  // Keyboard shortcut: Cmd/Ctrl + Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (open && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        const form = document.getElementById('new-task-form') as HTMLFormElement;
        if (form && title.trim()) {
          form.requestSubmit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, title]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Build common form data helper
    function buildFormData(overrideAssigneeId?: string | null): FormData {
      const fd = new FormData();
      fd.set('title', title);
      fd.set('description', description);
      fd.set('status', 'Todo');
      fd.set('show_in_inbox', 'true');

      if (projectId) fd.set('project_id', projectId);
      if (customProjectName) fd.set('custom_project_name', customProjectName);
      if (overrideAssigneeId) fd.set('assignee_id', overrideAssigneeId);
      if (dueDate) fd.set('due_date', format(dueDate, 'yyyy-MM-dd'));

      if (scheduledTime) {
        const [hours, minutes] = scheduledTime.split(':').map(Number);
        const today = new Date();
        const startTime = setMinutes(setHours(today, hours), minutes);
        const endTime = addMinutes(startTime, parseInt(duration, 10));
        fd.set('scheduled_start_time', startTime.toISOString());
        fd.set('scheduled_end_time', endTime.toISOString());
      }

      return fd;
    }

    let result;
    if (assigneeId === 'both') {
      // Create a task for each team member
      const assigneeIds = profiles.map((p) => p.id);
      const results = await Promise.all(assigneeIds.map((id) => createTask(buildFormData(id))));
      result = results.find((r) => !r.success) || results[0];
    } else {
      result = await createTask(buildFormData(assigneeId));
    }

    if (result.success) {
      setSuccess(true);
      invalidateInboxTasks();
      if (projectId) {
        invalidateProjectTasks(projectId);
      }

      // Close after brief success animation
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 600);
    } else {
      setError(result.error || 'Failed to create task');
    }

    setLoading(false);
  }

  const selectedAssignee = profiles.find((p) => p.id === assigneeId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="group relative overflow-hidden">
          <span className="relative z-10 flex items-center gap-2">
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
            <span>New Task</span>
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="overflow-hidden border-border/50 bg-gradient-to-b from-card to-card/95 p-0 shadow-2xl backdrop-blur-xl sm:max-w-[480px]"
        showCloseButton={false}
      >
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.1 }}
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10"
              >
                <Check className="h-8 w-8 text-emerald-500" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg font-medium text-foreground"
              >
                Task created!
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
                <DialogHeader className="flex-1">
                  <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                    New Task
                  </DialogTitle>
                </DialogHeader>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form */}
              <form id="new-task-form" onSubmit={handleSubmit} className="p-6">
                <div className="space-y-5">
                  {/* Title Input - Clean and prominent */}
                  <div>
                    <input
                      ref={inputRef}
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What needs to be done?"
                      required
                      className="w-full border-0 bg-transparent text-lg font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
                    />
                  </div>

                  {/* Description - Subtle expandable */}
                  <div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add details (optional)"
                      rows={2}
                      className="w-full resize-none rounded-lg border border-border/50 bg-secondary/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20"
                    />
                  </div>

                  {/* Quick Options Row */}
                  <div className="flex flex-wrap gap-2">
                    {/* Project Selector with "Other" option */}
                    <SelectWithOther
                      options={projects.map((project) => ({
                        value: project.id,
                        label: project.name,
                      }))}
                      value={customProjectName || projectId}
                      onChange={(value, isCustom) => {
                        if (isCustom) {
                          setProjectId('');
                          setCustomProjectName(value);
                        } else {
                          setProjectId(value);
                          setCustomProjectName('');
                        }
                      }}
                      placeholder="Project"
                      otherLabel="Other project..."
                      otherPlaceholder="Project name..."
                      icon={<FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />}
                      triggerClassName="rounded-full"
                    />

                    {/* Assignee Selector */}
                    <Select
                      value={assigneeId || 'unassigned'}
                      onValueChange={(v) => setAssigneeId(v === 'unassigned' ? null : v)}
                    >
                      <SelectTrigger
                        className={cn(
                          'h-9 w-auto min-w-[130px] gap-2 rounded-full border-border/50 bg-secondary/50 px-3 text-sm transition-all hover:bg-secondary',
                          assigneeId && 'border-primary/30 bg-primary/5'
                        )}
                      >
                        {assigneeId === 'both' ? (
                          <Users className="h-3.5 w-3.5 text-primary" />
                        ) : selectedAssignee ? (
                          <Avatar className="h-4 w-4">
                            {selectedAssignee.avatar_url && (
                              <AvatarImage src={selectedAssignee.avatar_url} />
                            )}
                            <AvatarFallback className="bg-primary/20 text-[8px] text-primary">
                              {getInitials(selectedAssignee.full_name || 'U')}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <SelectValue placeholder="Assign" />
                      </SelectTrigger>
                      <SelectContent className="border-border/50 bg-card/95 backdrop-blur-xl">
                        <SelectItem value="unassigned">
                          <span className="text-muted-foreground">Unassigned</span>
                        </SelectItem>
                        <SelectItem value="both">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            <span>Both</span>
                          </div>
                        </SelectItem>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                                <AvatarFallback className="bg-primary/20 text-[10px] text-primary">
                                  {getInitials(profile.full_name || profile.email || 'U')}
                                </AvatarFallback>
                              </Avatar>
                              <span>{profile.full_name || profile.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Time Slot */}
                    <Select
                      value={scheduledTime || 'none'}
                      onValueChange={(v) => setScheduledTime(v === 'none' ? '' : v)}
                    >
                      <SelectTrigger
                        className={cn(
                          'h-9 w-auto min-w-[120px] gap-2 rounded-full border-border/50 bg-secondary/50 px-3 text-sm transition-all hover:bg-secondary',
                          scheduledTime && 'border-primary/30 bg-primary/5'
                        )}
                      >
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <SelectValue placeholder="Time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] border-border/50 bg-card/95 backdrop-blur-xl">
                        <SelectItem value="none">No time</SelectItem>
                        {Array.from({ length: 17 }, (_, i) => {
                          const totalMinutes = 7.5 * 60 + i * 30;
                          const h = Math.floor(totalMinutes / 60);
                          const m = totalMinutes % 60;
                          const label = format(setMinutes(setHours(new Date(), h), m), 'h:mm a');
                          const value = `${h}:${m.toString().padStart(2, '0')}`;
                          return (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    {/* Duration */}
                    {scheduledTime && scheduledTime !== 'none' && (
                      <Select value={duration} onValueChange={setDuration}>
                        <SelectTrigger className="h-9 w-auto min-w-[90px] gap-2 rounded-full border-border/50 bg-secondary/50 px-3 text-sm transition-all hover:bg-secondary">
                          <SelectValue placeholder="Duration" />
                        </SelectTrigger>
                        <SelectContent className="border-border/50 bg-card/95 backdrop-blur-xl">
                          <SelectItem value="30">30 min</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="90">1.5 hours</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {/* Due Date */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            'h-9 gap-2 rounded-full border-border/50 bg-secondary/50 px-3 text-sm font-normal transition-all hover:bg-secondary',
                            dueDate && 'border-primary/30 bg-primary/5'
                          )}
                        >
                          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          {dueDate ? format(dueDate, 'MMM d') : 'Due date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto border-border/50 bg-card/95 p-0 backdrop-blur-xl"
                        align="start"
                      >
                        <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-sm text-destructive"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
                  <p className="text-xs text-muted-foreground">
                    <kbd className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px]">
                      ⌘
                    </kbd>
                    <span className="mx-1">+</span>
                    <kbd className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px]">
                      Enter
                    </kbd>
                    <span className="ml-1.5">to create</span>
                  </p>
                  <Button
                    type="submit"
                    disabled={loading || !title.trim()}
                    className="min-w-[100px]"
                  >
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                      />
                    ) : (
                      'Create Task'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

// Controlled variant for use with global keyboard shortcuts
interface NewTaskModalControlledProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAssigneeId?: string | null;
  defaultScheduledTime?: string | null;
}

export function NewTaskModalControlled({
  open,
  onOpenChange,
  defaultAssigneeId,
  defaultScheduledTime,
}: NewTaskModalControlledProps) {
  return (
    <NewTaskModal
      open={open}
      onOpenChange={onOpenChange}
      defaultAssigneeId={defaultAssigneeId}
      defaultScheduledTime={defaultScheduledTime}
    />
  );
}
