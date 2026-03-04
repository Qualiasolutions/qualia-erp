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
  Timer,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useMediaQuery } from '@/hooks/use-media-query';
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
import { getInitials } from '@/lib/utils';
import { createTask } from '@/app/actions/inbox';
import {
  useProfiles,
  useProjects,
  invalidateInboxTasks,
  invalidateProjectTasks,
  invalidateScheduledTasks,
  invalidateDailyFlow,
} from '@/lib/swr';
import { setHours, setMinutes, addMinutes } from 'date-fns';

interface NewTaskModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultAssigneeId?: string | null;
  defaultScheduledTime?: string | null;
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
  const isMobile = useMediaQuery('(max-width: 768px)');

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
  const [showDescription, setShowDescription] = useState(false);

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
      setShowDescription(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, defaultAssigneeId, defaultScheduledTime]);

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
      const assigneeIds = profiles.map((p) => p.id);
      const results = await Promise.all(assigneeIds.map((id) => createTask(buildFormData(id))));
      result = results.find((r) => !r.success) || results[0];
    } else {
      result = await createTask(buildFormData(assigneeId));
    }

    if (result.success) {
      setSuccess(true);
      invalidateInboxTasks(true);
      invalidateScheduledTasks(undefined, true);
      invalidateDailyFlow(true);
      if (projectId) {
        invalidateProjectTasks(projectId, true);
      }
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

  // Form content component (shared between Drawer and Dialog)
  const FormContent = () => (
    <AnimatePresence mode="wait">
      {success ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="flex flex-col items-center justify-center py-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.1 }}
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10"
          >
            <Check className="h-7 w-7 text-emerald-500" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base font-medium text-foreground"
          >
            Task created
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
          <div className="flex items-center justify-between px-5 pb-0 pt-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                <Sparkles className="h-3 w-3 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground/70">New task</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Form */}
          <form id="new-task-form" onSubmit={handleSubmit} className="px-5 pb-4 pt-3">
            {/* Title — prominent, borderless */}
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task name..."
              required
              className="w-full border-0 bg-transparent text-[17px] font-semibold text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            />

            {/* Description toggle / area */}
            {showDescription ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={2}
                autoFocus
                className="mt-2 w-full resize-none rounded-lg border border-border/30 bg-muted/30 px-3 py-2 text-sm text-foreground/80 placeholder:text-muted-foreground/40 focus:border-border/50 focus:outline-none dark:bg-muted/20"
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowDescription(true)}
                className="mt-1.5 text-[13px] text-muted-foreground/50 transition-colors hover:text-muted-foreground"
              >
                + Add description
              </button>
            )}

            {/* Divider */}
            <div className="my-4 h-px bg-border/30" />

            {/* Metadata — clean two-column grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Project */}
              <MetadataField label="Project" icon={FolderOpen}>
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
                  placeholder="None"
                  otherLabel="Other project..."
                  otherPlaceholder="Project name..."
                  triggerClassName="h-8 w-full rounded-md border-0 bg-transparent px-0 text-sm font-normal text-foreground/80 shadow-none hover:bg-transparent focus:ring-0 min-w-0"
                />
              </MetadataField>

              {/* Assignee */}
              <MetadataField label="Assignee" icon={User}>
                <Select
                  value={assigneeId || 'unassigned'}
                  onValueChange={(v) => setAssigneeId(v === 'unassigned' ? null : v)}
                >
                  <SelectTrigger className="h-8 w-full border-0 bg-transparent px-0 text-sm font-normal text-foreground/80 shadow-none hover:bg-transparent focus:ring-0">
                    {assigneeId === 'both' ? (
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Both</span>
                      </span>
                    ) : selectedAssignee ? (
                      <span className="flex items-center gap-1.5">
                        <Avatar className="h-4 w-4">
                          {selectedAssignee.avatar_url && (
                            <AvatarImage src={selectedAssignee.avatar_url} />
                          )}
                          <AvatarFallback className="bg-primary/20 text-[8px] text-primary">
                            {getInitials(selectedAssignee.full_name || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <span>{selectedAssignee.full_name?.split(' ')[0]}</span>
                      </span>
                    ) : (
                      <SelectValue placeholder="None" />
                    )}
                  </SelectTrigger>
                  <SelectContent className="border-border/40 bg-card shadow-xl dark:border-border/50">
                    <SelectItem value="unassigned">
                      <span className="text-muted-foreground">Unassigned</span>
                    </SelectItem>
                    <SelectItem value="both">
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-primary" />
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
              </MetadataField>

              {/* Time */}
              <MetadataField label="Time" icon={Clock}>
                <Select
                  value={scheduledTime || 'none'}
                  onValueChange={(v) => setScheduledTime(v === 'none' ? '' : v)}
                >
                  <SelectTrigger className="h-8 w-full border-0 bg-transparent px-0 text-sm font-normal text-foreground/80 shadow-none hover:bg-transparent focus:ring-0">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] border-border/40 bg-card shadow-xl dark:border-border/50">
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
              </MetadataField>

              {/* Due Date */}
              <MetadataField label="Due date" icon={CalendarIcon}>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex h-8 w-full items-center text-sm text-foreground/80 hover:text-foreground"
                    >
                      {dueDate ? (
                        <span className="flex items-center gap-1.5">
                          {format(dueDate, 'MMM d, yyyy')}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDueDate(undefined);
                            }}
                            className="ml-1 rounded p-0.5 text-muted-foreground/50 hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">None</span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto border-border/40 bg-card p-0 shadow-xl dark:border-border/50"
                    align="start"
                  >
                    <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
                  </PopoverContent>
                </Popover>
              </MetadataField>

              {/* Duration — only when time is set */}
              {scheduledTime && scheduledTime !== 'none' && (
                <MetadataField label="Duration" icon={Timer}>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="h-8 w-full border-0 bg-transparent px-0 text-sm font-normal text-foreground/80 shadow-none hover:bg-transparent focus:ring-0">
                      <SelectValue placeholder="30 min" />
                    </SelectTrigger>
                    <SelectContent className="border-border/40 bg-card shadow-xl dark:border-border/50">
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </MetadataField>
              )}
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mt-3 text-sm text-destructive"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Footer */}
            <div className="mt-5 flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-muted-foreground/40">
                <kbd className="rounded border border-border/30 bg-muted/50 px-1 py-0.5 font-mono text-[10px] leading-none text-muted-foreground/50">
                  {'\u2318'}
                </kbd>
                <kbd className="rounded border border-border/30 bg-muted/50 px-1 py-0.5 font-mono text-[10px] leading-none text-muted-foreground/50">
                  {'\u23CE'}
                </kbd>
              </span>
              <Button
                type="submit"
                disabled={loading || !title.trim()}
                size="sm"
                className="h-8 min-w-[90px] rounded-md text-[13px] font-medium"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"
                  />
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Mobile: Drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        {!isControlled && (
          <DrawerTrigger asChild>
            <Button className="group relative overflow-hidden">
              <span className="relative z-10 flex items-center gap-2">
                <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                <span>New Task</span>
              </span>
            </Button>
          </DrawerTrigger>
        )}
        <DrawerContent className="dark:bg-card/98 border-border/40 bg-card p-0 shadow-2xl dark:border-border/50">
          <DrawerHeader className="sr-only">
            <DrawerTitle>New Task</DrawerTitle>
            <DrawerDescription>Create a new task</DrawerDescription>
          </DrawerHeader>
          <FormContent />
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Dialog
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button className="group relative overflow-hidden">
            <span className="relative z-10 flex items-center gap-2">
              <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
              <span>New Task</span>
            </span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        className="dark:bg-card/98 overflow-hidden border-border/40 bg-card p-0 shadow-2xl dark:border-border/50 sm:max-w-[520px]"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <FormContent />
      </DialogContent>
    </Dialog>
  );
}

/** Labeled metadata row used in the form grid */
function MetadataField({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof Clock;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-1 transition-colors hover:bg-muted/40">
      <div className="flex w-[90px] shrink-0 items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground/50" />
        <span className="text-[13px] text-muted-foreground/60">{label}</span>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
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
