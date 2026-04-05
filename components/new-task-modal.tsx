'use client';

import { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from '@/lib/lazy-motion';
import {
  Plus,
  CalendarIcon,
  User,
  Users,
  FolderOpen,
  Check,
  X,
  Clock,
  Timer,
  Paperclip,
  Search,
} from 'lucide-react';
import { format, setHours, setMinutes, addMinutes } from 'date-fns';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import { createTask } from '@/app/actions/inbox';
import {
  useProfiles,
  useProjects,
  invalidateInboxTasks,
  invalidateProjectTasks,
  invalidateScheduledTasks,
  invalidateDailyFlow,
} from '@/lib/swr';
import { useAdminContext } from '@/components/admin-provider';

/* ─── Time & duration options ─── */

const TIME_SLOTS = Array.from({ length: 17 }, (_, i) => {
  const totalMinutes = 7.5 * 60 + i * 30;
  const h = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const label = format(setMinutes(setHours(new Date(), h), mins), 'h:mm a');
  const value = `${h}:${mins.toString().padStart(2, '0')}`;
  return { label, value };
});

const DURATION_OPTIONS = [
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
];

/* ─── Interfaces ─── */

interface NewTaskModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultAssigneeId?: string | null;
  defaultScheduledTime?: string | null;
}

/* ─── Main component ─── */

export function NewTaskModal({
  open: controlledOpen,
  onOpenChange,
  defaultAssigneeId,
  defaultScheduledTime,
}: NewTaskModalProps = {}) {
  const { profiles } = useProfiles();
  const { projects } = useProjects();
  const { isAdmin } = useAdminContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Open state (controlled or internal)
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (v: boolean) => onOpenChange?.(v) : setInternalOpen;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [customProjectName, setCustomProjectName] = useState('');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [requiresAttachment, setRequiresAttachment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  // Popover states
  const [projectOpen, setProjectOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [durationOpen, setDurationOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [showCustomProject, setShowCustomProject] = useState(false);

  // Reset on open
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
      setRequiresAttachment('');
      setError(null);
      setSuccess(false);
      setShowDescription(false);
      setProjectSearch('');
      setShowCustomProject(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, defaultAssigneeId, defaultScheduledTime]);

  // ⌘+Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (open && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        const form = document.getElementById('new-task-form') as HTMLFormElement;
        if (form && title.trim()) form.requestSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, title]);

  // Submit handler
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
      if (requiresAttachment.trim()) fd.set('requires_attachment', requiresAttachment.trim());
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
      if (projectId) invalidateProjectTasks(projectId, true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 600);
    } else {
      setError(result.error || 'Failed to create task');
    }
    setLoading(false);
  }

  // Derived values
  const selectedAssignee = profiles.find((p) => p.id === assigneeId);
  const selectedProject = projects.find((p) => p.id === projectId);
  const filteredProjects = projectSearch
    ? projects.filter((p) => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
    : projects;
  const selectedTimeLabel = scheduledTime
    ? TIME_SLOTS.find((s) => s.value === scheduledTime)?.label || scheduledTime
    : null;
  const selectedDurationLabel =
    DURATION_OPTIONS.find((d) => d.value === duration)?.label || '1 hour';

  /* ─── Form content (shared between Dialog / Drawer) ─── */

  const formContent = (
    <AnimatePresence mode="wait">
      {success ? (
        <m.div
          key="success"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="flex flex-col items-center justify-center py-16"
        >
          <m.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.3, delay: 0.1 }}
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10"
          >
            <Check className="h-7 w-7 text-emerald-500" />
          </m.div>
          <m.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base font-medium text-foreground"
          >
            Task created
          </m.p>
        </m.div>
      ) : (
        <m.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {/* Header — clean, no icon */}
          <div className="flex items-center justify-between px-5 pb-0 pt-4">
            <span className="text-sm font-medium text-foreground/70">New task</span>
            <button
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Form */}
          <form id="new-task-form" onSubmit={handleSubmit} className="px-5 pb-4 pt-3">
            {/* Title */}
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task name..."
              required
              aria-label="Task name"
              className="w-full border-0 bg-transparent text-[17px] font-semibold text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            />

            {/* Description */}
            {showDescription ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={2}
                autoFocus
                aria-label="Task description"
                className="mt-2 w-full resize-none rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground/80 placeholder:text-muted-foreground/40 focus:border-border focus:outline-none dark:bg-muted/20"
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

            <div className="my-4 h-px bg-border/30" />

            {/* ── Properties (single column) ── */}
            <div className="space-y-0.5">
              {/* Project */}
              <PropertyRow label="Project" icon={FolderOpen}>
                <Popover
                  open={projectOpen}
                  onOpenChange={(v) => {
                    setProjectOpen(v);
                    if (!v) {
                      setProjectSearch('');
                      setShowCustomProject(false);
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted/60',
                        selectedProject || customProjectName
                          ? 'text-foreground'
                          : 'text-muted-foreground/60'
                      )}
                    >
                      {customProjectName || selectedProject?.name || 'None'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[260px] p-0">
                    {showCustomProject ? (
                      <div className="p-3">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          Custom project name
                        </p>
                        <div className="flex gap-2">
                          <input
                            autoFocus
                            type="text"
                            value={customProjectName}
                            onChange={(e) => setCustomProjectName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && customProjectName.trim()) {
                                e.preventDefault();
                                setProjectId('');
                                setProjectOpen(false);
                              } else if (e.key === 'Escape') {
                                setShowCustomProject(false);
                                setCustomProjectName('');
                              }
                            }}
                            placeholder="Project name..."
                            className="h-8 flex-1 rounded-md border border-border bg-muted/50 px-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none"
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="h-8"
                            disabled={!customProjectName.trim()}
                            onClick={() => {
                              if (customProjectName.trim()) {
                                setProjectId('');
                                setProjectOpen(false);
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="border-b border-border p-2">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                            <input
                              autoFocus
                              type="text"
                              value={projectSearch}
                              onChange={(e) => setProjectSearch(e.target.value)}
                              placeholder="Search projects..."
                              className="h-8 w-full rounded-md bg-muted/50 pl-8 pr-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="max-h-[220px] overflow-y-auto p-1">
                          <OptionButton
                            selected={!projectId && !customProjectName}
                            onClick={() => {
                              setProjectId('');
                              setCustomProjectName('');
                              setProjectOpen(false);
                            }}
                          >
                            <span className="text-muted-foreground">None</span>
                          </OptionButton>
                          {filteredProjects.map((project) => (
                            <OptionButton
                              key={project.id}
                              selected={projectId === project.id}
                              onClick={() => {
                                setProjectId(project.id);
                                setCustomProjectName('');
                                setProjectOpen(false);
                              }}
                            >
                              <span className="truncate">{project.name}</span>
                            </OptionButton>
                          ))}
                          {filteredProjects.length === 0 && projectSearch && (
                            <p className="px-2.5 py-3 text-center text-sm text-muted-foreground/60">
                              No results
                            </p>
                          )}
                        </div>
                        <div className="border-t border-border p-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowCustomProject(true);
                              setCustomProjectName(projectSearch);
                            }}
                            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-primary transition-colors hover:bg-primary/5"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Other project...</span>
                          </button>
                        </div>
                      </>
                    )}
                  </PopoverContent>
                </Popover>
              </PropertyRow>

              {/* Assignee */}
              <PropertyRow label="Assignee" icon={User}>
                <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted/60',
                        assigneeId ? 'text-foreground' : 'text-muted-foreground/60'
                      )}
                    >
                      {assigneeId === 'both' ? (
                        <>
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Both</span>
                        </>
                      ) : selectedAssignee ? (
                        <>
                          <Avatar className="h-4 w-4">
                            {selectedAssignee.avatar_url && (
                              <AvatarImage src={selectedAssignee.avatar_url} />
                            )}
                            <AvatarFallback className="bg-primary/20 text-[8px] text-primary">
                              {getInitials(selectedAssignee.full_name || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <span>{selectedAssignee.full_name?.split(' ')[0]}</span>
                        </>
                      ) : (
                        'Unassigned'
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[220px] p-1">
                    <OptionButton
                      selected={!assigneeId}
                      onClick={() => {
                        setAssigneeId(null);
                        setAssigneeOpen(false);
                      }}
                    >
                      <span className="text-muted-foreground">Unassigned</span>
                    </OptionButton>
                    <OptionButton
                      selected={assigneeId === 'both'}
                      onClick={() => {
                        setAssigneeId('both');
                        setAssigneeOpen(false);
                      }}
                    >
                      <Users className="h-3.5 w-3.5 text-primary" />
                      <span>Both</span>
                    </OptionButton>
                    <div className="my-1 h-px bg-border/50" />
                    {profiles.map((profile) => (
                      <OptionButton
                        key={profile.id}
                        selected={assigneeId === profile.id}
                        onClick={() => {
                          setAssigneeId(profile.id);
                          setAssigneeOpen(false);
                        }}
                      >
                        <Avatar className="h-5 w-5">
                          {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                          <AvatarFallback className="bg-primary/20 text-[10px] text-primary">
                            {getInitials(profile.full_name || profile.email || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{profile.full_name || profile.email}</span>
                      </OptionButton>
                    ))}
                  </PopoverContent>
                </Popover>
              </PropertyRow>

              {/* Due date */}
              <PropertyRow label="Due date" icon={CalendarIcon}>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted/60',
                        dueDate ? 'text-foreground' : 'text-muted-foreground/60'
                      )}
                    >
                      {dueDate ? (
                        <>
                          {format(dueDate, 'MMM d, yyyy')}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDueDate(undefined);
                              setDateOpen(false);
                            }}
                            className="ml-0.5 rounded p-0.5 text-muted-foreground/40 hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        'None'
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={(d) => {
                        setDueDate(d);
                        setDateOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </PropertyRow>

              {/* Time */}
              <PropertyRow label="Time" icon={Clock}>
                <Popover open={timeOpen} onOpenChange={setTimeOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted/60',
                        scheduledTime ? 'text-foreground' : 'text-muted-foreground/60'
                      )}
                    >
                      {selectedTimeLabel || 'No time'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[170px] p-1">
                    <div className="max-h-[220px] overflow-y-auto">
                      <OptionButton
                        selected={!scheduledTime}
                        onClick={() => {
                          setScheduledTime('');
                          setTimeOpen(false);
                        }}
                      >
                        No time
                      </OptionButton>
                      {TIME_SLOTS.map((slot) => (
                        <OptionButton
                          key={slot.value}
                          selected={scheduledTime === slot.value}
                          onClick={() => {
                            setScheduledTime(slot.value);
                            setTimeOpen(false);
                          }}
                        >
                          {slot.label}
                        </OptionButton>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </PropertyRow>

              {/* Duration (only when time is set) */}
              {scheduledTime && (
                <PropertyRow label="Duration" icon={Timer}>
                  <Popover open={durationOpen} onOpenChange={setDurationOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-foreground transition-colors hover:bg-muted/60"
                      >
                        {selectedDurationLabel}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[150px] p-1">
                      {DURATION_OPTIONS.map((opt) => (
                        <OptionButton
                          key={opt.value}
                          selected={duration === opt.value}
                          onClick={() => {
                            setDuration(opt.value);
                            setDurationOpen(false);
                          }}
                        >
                          {opt.label}
                        </OptionButton>
                      ))}
                    </PopoverContent>
                  </Popover>
                </PropertyRow>
              )}

              {/* Require attachment — admin only */}
              {isAdmin && (
                <PropertyRow label="Require upload" icon={Paperclip}>
                  <input
                    type="text"
                    value={requiresAttachment}
                    onChange={(e) => setRequiresAttachment(e.target.value)}
                    placeholder="e.g. Screenshot of completed work"
                    className="h-7 w-full rounded-md bg-transparent px-2 text-sm text-foreground/80 placeholder:text-muted-foreground/40 focus:bg-muted/30 focus:outline-none"
                  />
                </PropertyRow>
              )}
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <m.p
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mt-3 text-sm text-destructive"
                >
                  {error}
                </m.p>
              )}
            </AnimatePresence>

            {/* Footer */}
            <div className="mt-5 flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-muted-foreground/40">
                <kbd className="rounded border border-border bg-muted/50 px-1 py-0.5 font-mono text-[10px] leading-none text-muted-foreground/50">
                  {'\u2318'}
                </kbd>
                <kbd className="rounded border border-border bg-muted/50 px-1 py-0.5 font-mono text-[10px] leading-none text-muted-foreground/50">
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
                  <m.div
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
        </m.div>
      )}
    </AnimatePresence>
  );

  /* ─── Mobile: Drawer ─── */
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
        <DrawerContent className="dark:bg-card/98 border-border bg-card p-0 shadow-2xl dark:border-border">
          <DrawerHeader className="sr-only">
            <DrawerTitle>New Task</DrawerTitle>
            <DrawerDescription>Create a new task</DrawerDescription>
          </DrawerHeader>
          {formContent}
        </DrawerContent>
      </Drawer>
    );
  }

  /* ─── Desktop: Dialog ─── */
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
        className="dark:bg-card/98 overflow-hidden border-border bg-card p-0 shadow-2xl dark:border-border sm:max-w-[520px]"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Helpers ─── */

function PropertyRow({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof Clock;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-1 py-0.5 transition-colors hover:bg-muted/30">
      <div className="flex w-[100px] shrink-0 items-center gap-2.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground/50" />
        <span className="text-[13px] text-muted-foreground/60">{label}</span>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors',
        selected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/80'
      )}
    >
      {children}
      {selected && <Check className="ml-auto h-3.5 w-3.5 shrink-0" />}
    </button>
  );
}

/* ─── Controlled export ─── */

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
