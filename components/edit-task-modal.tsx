'use client';

import { useState, useEffect, useOptimistic } from 'react';
import {
  CalendarIcon,
  User,
  FolderOpen,
  Clock,
  Timer,
  Paperclip,
  Check,
  X,
  Circle,
  Search,
  Activity,
  Flag,
} from 'lucide-react';
import { format, setHours, setMinutes, addMinutes, differenceInMinutes, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import { useAdminContext } from '@/components/admin-provider';
import { updateTask, type Task } from '@/app/actions/inbox';
import {
  useProfiles,
  useProjects,
  invalidateInboxTasks,
  invalidateProjectTasks,
  invalidateScheduledTasks,
  invalidateDailyFlow,
} from '@/lib/swr';

/* ─── Options ─── */

const STATUS_OPTIONS = [
  { value: 'Todo', label: 'Todo', color: 'bg-slate-400' },
  { value: 'In Progress', label: 'In Progress', color: 'bg-amber-500' },
  { value: 'Done', label: 'Done', color: 'bg-emerald-500' },
];

const PRIORITY_OPTIONS = [
  { value: 'No Priority', label: 'No Priority', color: '' },
  { value: 'Urgent', label: 'Urgent', color: 'bg-red-500 text-red-500' },
  { value: 'High', label: 'High', color: 'bg-orange-500 text-orange-500' },
  { value: 'Medium', label: 'Medium', color: 'bg-amber-500 text-amber-500' },
  { value: 'Low', label: 'Low', color: 'bg-blue-500 text-blue-500' },
];

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

/* ─── Component ─── */

interface EditTaskModalProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTaskModal({ task, open, onOpenChange }: EditTaskModalProps) {
  const { profiles } = useProfiles();
  const { projects } = useProjects();
  const { isAdmin } = useAdminContext();

  // Form state
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority || 'No Priority');
  const [assigneeId, setAssigneeId] = useState(task.assignee_id || 'unassigned');
  const [selectedProjectId, setSelectedProjectId] = useState(task.project_id || 'no-project');
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.due_date ? new Date(task.due_date) : undefined
  );
  const [scheduledTime, setScheduledTime] = useState(() => {
    if (task.scheduled_start_time) {
      const start = parseISO(task.scheduled_start_time);
      return `${start.getHours()}:${start.getMinutes().toString().padStart(2, '0')}`;
    }
    return '';
  });
  const [duration, setDuration] = useState(() => {
    if (task.scheduled_start_time && task.scheduled_end_time) {
      const mins = differenceInMinutes(
        parseISO(task.scheduled_end_time),
        parseISO(task.scheduled_start_time)
      );
      return String(mins);
    }
    return '30';
  });
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Popover states
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [durationOpen, setDurationOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');

  // Optimistic updates
  const [optimisticTask, updateOptimisticTask] = useOptimistic(
    task,
    (currentTask: Task, updatedFields: Partial<Task>) => ({
      ...currentTask,
      ...updatedFields,
    })
  );

  // Reset on open
  useEffect(() => {
    if (open) {
      setStatus(task.status);
      setPriority(task.priority || 'No Priority');
      setAssigneeId(task.assignee_id || 'unassigned');
      setSelectedProjectId(task.project_id || 'no-project');
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setError(null);
      setProjectSearch('');
      if (task.scheduled_start_time) {
        const start = parseISO(task.scheduled_start_time);
        setScheduledTime(`${start.getHours()}:${start.getMinutes().toString().padStart(2, '0')}`);
      } else {
        setScheduledTime('');
      }
      if (task.scheduled_start_time && task.scheduled_end_time) {
        const mins = differenceInMinutes(
          parseISO(task.scheduled_end_time),
          parseISO(task.scheduled_start_time)
        );
        setDuration(String(mins));
      } else {
        setDuration('30');
      }
    }
  }, [open, task]);

  // Submit handler
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    // Manually set controlled values
    formData.set('id', task.id);
    formData.set('status', status);
    formData.set('priority', priority);
    formData.set('assignee_id', assigneeId);
    if (selectedProjectId && selectedProjectId !== 'no-project') {
      formData.set('project_id', selectedProjectId);
    } else {
      formData.set('project_id', '');
    }
    if (dueDate) {
      formData.set('due_date', format(dueDate, 'yyyy-MM-dd'));
    }
    if (scheduledTime && scheduledTime !== 'none') {
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const today = new Date();
      const startTime = setMinutes(setHours(today, hours), minutes);
      const endTime = addMinutes(startTime, parseInt(duration, 10));
      formData.set('scheduled_start_time', startTime.toISOString());
      formData.set('scheduled_end_time', endTime.toISOString());
    } else {
      formData.set('scheduled_start_time', '');
      formData.set('scheduled_end_time', '');
    }

    // Optimistic update
    const title = formData.get('title') as string;
    if (!title.trim()) {
      setError('Title is required');
      setIsPending(false);
      return;
    }

    updateOptimisticTask({
      title: title.trim(),
      description: (formData.get('description') as string) || null,
      status: status as Task['status'],
      priority: priority as Task['priority'],
      assignee_id: assigneeId === 'unassigned' ? null : assigneeId,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      project_id: selectedProjectId !== 'no-project' ? selectedProjectId : null,
    });

    const result = await updateTask(formData);

    if (result.success) {
      onOpenChange(false);
      invalidateInboxTasks(true);
      invalidateScheduledTasks(undefined, true);
      invalidateDailyFlow(true);
      if (task.project_id) invalidateProjectTasks(task.project_id, true);
      if (
        selectedProjectId &&
        selectedProjectId !== 'no-project' &&
        selectedProjectId !== task.project_id
      ) {
        invalidateProjectTasks(selectedProjectId, true);
      }
    } else {
      setError(result.error || 'Failed to update task');
    }
    setIsPending(false);
  }

  // Derived values
  const selectedAssignee = profiles.find((p) => p.id === assigneeId);
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const filteredProjects = projectSearch
    ? projects.filter((p) => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
    : projects;
  const currentStatus = STATUS_OPTIONS.find((s) => s.value === status);
  const currentPriority = PRIORITY_OPTIONS.find((p) => p.value === priority);
  const selectedTimeLabel = scheduledTime
    ? TIME_SLOTS.find((s) => s.value === scheduledTime)?.label || scheduledTime
    : null;
  const selectedDurationLabel =
    DURATION_OPTIONS.find((d) => d.value === duration)?.label || '30 min';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card p-0 text-foreground sm:max-w-[640px]">
        <DialogHeader className="px-6 pb-0 pt-6">
          <DialogTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Edit task
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6">
          {/* Title */}
          <input
            name="title"
            defaultValue={optimisticTask.title}
            placeholder="Task title"
            required
            className="mb-3 w-full border-0 bg-transparent text-xl font-semibold leading-snug text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
          />

          {/* Description */}
          <textarea
            name="description"
            defaultValue={optimisticTask.description || ''}
            placeholder="Add a description..."
            rows={8}
            className="mb-4 min-h-[180px] w-full resize-y rounded-lg border border-border bg-muted/30 px-4 py-3 text-[15px] leading-relaxed text-foreground/90 placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-muted/20"
          />

          <div className="mb-4 h-px bg-border/30" />

          {/* ── Properties ── */}
          <div className="space-y-0.5">
            {/* Status */}
            <PropertyRow label="Status" icon={Activity}>
              <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-foreground transition-colors hover:bg-muted/60"
                  >
                    {currentStatus && (
                      <span className={cn('h-2 w-2 rounded-full', currentStatus.color)} />
                    )}
                    {status}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[180px] p-1">
                  {STATUS_OPTIONS.map((opt) => (
                    <OptionButton
                      key={opt.value}
                      selected={status === opt.value}
                      onClick={() => {
                        setStatus(opt.value as Task['status']);
                        setStatusOpen(false);
                      }}
                    >
                      <span className={cn('h-2 w-2 rounded-full', opt.color)} />
                      <span>{opt.label}</span>
                    </OptionButton>
                  ))}
                </PopoverContent>
              </Popover>
            </PropertyRow>

            {/* Priority */}
            <PropertyRow label="Priority" icon={Flag}>
              <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-foreground transition-colors hover:bg-muted/60"
                  >
                    {currentPriority?.color && (
                      <Circle
                        className={cn(
                          'h-2 w-2',
                          currentPriority.color.includes('text-') ? currentPriority.color : ''
                        )}
                        fill="currentColor"
                      />
                    )}
                    {priority}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[180px] p-1">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <OptionButton
                      key={opt.value}
                      selected={priority === opt.value}
                      onClick={() => {
                        setPriority(opt.value as Task['priority']);
                        setPriorityOpen(false);
                      }}
                    >
                      {opt.color ? (
                        <Circle
                          className={cn('h-2 w-2', opt.color.includes('text-') ? opt.color : '')}
                          fill="currentColor"
                        />
                      ) : (
                        <span className="h-2 w-2" />
                      )}
                      <span>{opt.label}</span>
                    </OptionButton>
                  ))}
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
                      assigneeId !== 'unassigned' ? 'text-foreground' : 'text-muted-foreground/60'
                    )}
                  >
                    {selectedAssignee ? (
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
                    selected={assigneeId === 'unassigned'}
                    onClick={() => {
                      setAssigneeId('unassigned');
                      setAssigneeOpen(false);
                    }}
                  >
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Unassigned</span>
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

            {/* Project */}
            <PropertyRow label="Project" icon={FolderOpen}>
              <Popover
                open={projectOpen}
                onOpenChange={(v) => {
                  setProjectOpen(v);
                  if (!v) setProjectSearch('');
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted/60',
                      selectedProject ? 'text-foreground' : 'text-muted-foreground/60'
                    )}
                  >
                    {selectedProject?.name || 'No Project'}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[260px] p-0">
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
                      selected={selectedProjectId === 'no-project'}
                      onClick={() => {
                        setSelectedProjectId('no-project');
                        setProjectOpen(false);
                      }}
                    >
                      <span className="text-muted-foreground">No Project</span>
                    </OptionButton>
                    {filteredProjects.map((project) => (
                      <OptionButton
                        key={project.id}
                        selected={selectedProjectId === project.id}
                        onClick={() => {
                          setSelectedProjectId(project.id);
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

            {/* Duration */}
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
                  name="requires_attachment"
                  defaultValue={task.requires_attachment || ''}
                  placeholder="e.g. Screenshot of completed work"
                  className="h-7 w-full rounded-md bg-transparent px-2 text-sm text-foreground/80 placeholder:text-muted-foreground/40 focus:bg-muted/30 focus:outline-none"
                />
              </PropertyRow>
            )}
          </div>

          {/* Error */}
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          {/* Footer */}
          <div className="mt-5 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-primary font-medium hover:bg-primary/90"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
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
