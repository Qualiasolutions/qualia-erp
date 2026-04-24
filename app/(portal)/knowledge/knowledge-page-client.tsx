'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen,
  Layers,
  GitBranch,
  Wrench,
  FileText,
  ListChecks,
  Check,
  Search,
  X,
  AlertTriangle,
  Lightbulb,
  Copy,
  CheckCheck,
  ClipboardList,
  ArrowRight,
  Code2,
  Pencil,
  Save,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Database,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { m, AnimatePresence } from '@/lib/lazy-motion';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { guides as defaultGuides, type Guide, type GuideStep } from '@/lib/guides-data';
import { updateKnowledgeGuide, seedKnowledgeGuides } from '@/app/actions/knowledge';

interface KnowledgeData {
  foundationsGuides: Guide[];
  lifecycleGuides: Guide[];
  operationsGuides: Guide[];
  referenceGuides: Guide[];
  checklistGuides: Guide[];
  allGuides: Guide[];
}

interface KnowledgePageClientProps {
  initialData: KnowledgeData;
  isAdmin?: boolean;
}

const categoryIcons: Record<string, React.ElementType> = {
  foundations: Layers,
  lifecycle: GitBranch,
  operations: Wrench,
  reference: FileText,
  checklist: ListChecks,
};

const categoryLabels: Record<string, string> = {
  foundations: 'Foundations',
  lifecycle: 'Build Lifecycle',
  operations: 'Daily Operations',
  reference: 'Reference',
  checklist: 'Shipping Checklists',
};

const categoryDescriptions: Record<string, string> = {
  foundations: 'Understand the system before using it',
  lifecycle: 'The full build cycle — step by step',
  operations: 'Quick tasks, debugging, design polish',
  reference: 'Commands, infrastructure, troubleshooting',
  checklist: 'Verify before shipping',
};

const categoryColors: Record<
  string,
  { bg: string; text: string; border: string; accent: string; gradient: string }
> = {
  foundations: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20',
    accent: 'bg-blue-500',
    gradient: 'from-blue-500/10 via-transparent to-transparent',
  },
  lifecycle: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
    accent: 'bg-emerald-500',
    gradient: 'from-emerald-500/10 via-transparent to-transparent',
  },
  operations: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20',
    accent: 'bg-amber-500',
    gradient: 'from-amber-500/10 via-transparent to-transparent',
  },
  reference: {
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/20',
    accent: 'bg-violet-500',
    gradient: 'from-violet-500/10 via-transparent to-transparent',
  },
  checklist: {
    bg: 'bg-primary/[0.06]',
    text: 'text-primary',
    border: 'border-primary/20',
    accent: 'bg-primary',
    gradient: 'from-primary/10 via-transparent to-transparent',
  },
};

// Lifecycle pipeline visualization
function LifecyclePipeline({ onStepClick }: { onStepClick?: (slug: string) => void }) {
  const steps = [
    { label: 'New', slug: 'new-project', icon: '1' },
    { label: 'Discuss', slug: 'discuss-phase', icon: '2' },
    { label: 'Plan', slug: 'plan-phase', icon: '3' },
    { label: 'Execute', slug: 'execute-phase', icon: '4' },
    { label: 'Verify', slug: 'verify-work', icon: '5' },
    { label: 'Ship', slug: 'ship-project', icon: '6' },
  ];

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-4">
      <div className="mb-2.5 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        Build Lifecycle
      </div>
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        {steps.map((step, i) => (
          <div key={step.slug} className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onStepClick?.(step.slug)}
              className="group flex flex-col items-center gap-1 transition-all duration-150 ease-premium hover:scale-105"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-600 transition-colors duration-150 group-hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:group-hover:bg-emerald-500/20 sm:h-9 sm:w-9 sm:text-xs">
                {step.icon}
              </div>
              <span className="text-[10px] font-medium text-muted-foreground/70 transition-colors duration-150 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 sm:text-[11px]">
                {step.label}
              </span>
            </button>
            {i < steps.length - 1 && <div className="mt-[-14px] h-px w-3 bg-border sm:w-6" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// Copyable command block
function CommandBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // Strip "— comment" suffixes for clipboard
    const cleanCmd = command.split(' — ')[0].trim();
    navigator.clipboard.writeText(cleanCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="group/cmd flex w-full items-center gap-2.5 rounded-lg bg-muted px-3.5 py-2.5 text-left font-mono text-sm transition-all duration-150 hover:bg-muted/80"
    >
      <span className="text-muted-foreground/50">$</span>
      <span className="min-w-0 flex-1 break-all text-foreground">{command}</span>
      <span className="shrink-0 text-muted-foreground/50 transition-colors duration-150 group-hover/cmd:text-muted-foreground">
        {copied ? (
          <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </span>
    </button>
  );
}

// Example block — shows file content, diagrams, or output
function ExampleBlock({ title, content }: { title?: string; content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-3 overflow-hidden rounded-lg bg-muted">
      {title && (
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-2">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Code2 className="h-3 w-3" />
            {title}
          </span>
          <button
            onClick={handleCopy}
            className="text-muted-foreground/50 transition-colors duration-150 hover:text-muted-foreground"
          >
            {copied ? (
              <CheckCheck className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </div>
      )}
      <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-foreground">
        {content}
      </pre>
    </div>
  );
}

// Single step in the detail panel
function StepCard({
  step,
  index,
  total,
  accentColor,
}: {
  step: GuideStep;
  index: number;
  total: number;
  accentColor: string;
}) {
  const isLast = index === total - 1;

  return (
    <m.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className="relative flex gap-4"
    >
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center pt-1">
        {/* text-white ok: sits on solid bg-amber-500 milestone dot */}
        <div
          className={cn(
            'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold tabular-nums',
            step.isMilestone
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
              : `${accentColor}/15 text-muted-foreground`
          )}
        >
          {index + 1}
        </div>
        {!isLast && (
          <div className="mt-1 w-px flex-1 bg-gradient-to-b from-border/60 to-border/20" />
        )}
      </div>

      {/* Step content */}
      <div className={cn('min-w-0 flex-1 pb-6', isLast && 'pb-0')}>
        {/* Warning callout */}
        {step.warning && (
          <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3.5 py-3 text-[13px] leading-relaxed text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>{step.warning}</span>
          </div>
        )}

        {/* Title */}
        <h4
          className={cn(
            'text-[15px] font-semibold leading-snug text-foreground',
            step.isMilestone && 'text-amber-600 dark:text-amber-400'
          )}
        >
          {step.title}
        </h4>

        {/* Description */}
        {step.description && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            {step.description}
          </p>
        )}

        {/* Example block */}
        {step.example && <ExampleBlock title={step.exampleTitle} content={step.example} />}

        {/* Commands */}
        {step.commands && step.commands.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {step.commands.map((cmd, i) => (
              <CommandBlock key={i} command={cmd} />
            ))}
          </div>
        )}

        {/* Tips */}
        {step.tips && step.tips.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {step.tips.map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-[13px] leading-relaxed text-muted-foreground"
              >
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" />
                <span>{tip}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </m.div>
  );
}

// Step editor — expandable form for a single step
function StepEditor({
  step,
  index,
  onChange,
  onRemove,
}: {
  step: GuideStep;
  index: number;
  onChange: (updated: GuideStep) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const update = (field: string, value: unknown) => {
    onChange({ ...step, [field]: value });
  };

  return (
    <div className="rounded-lg border border-border bg-muted/20">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="mr-1.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">
          {step.title || 'Untitled step'}
        </span>
        {step.isMilestone && (
          <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            Milestone
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="shrink-0 rounded p-1 text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-border px-3 pb-3 pt-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Title
            </label>
            <Input
              value={step.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Step title"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Description
            </label>
            <Textarea
              value={step.description || ''}
              onChange={(e) => update('description', e.target.value || undefined)}
              placeholder="Step description"
              rows={3}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Warning
            </label>
            <Input
              value={step.warning || ''}
              onChange={(e) => update('warning', e.target.value || undefined)}
              placeholder="Optional warning message"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Commands (one per line)
            </label>
            <Textarea
              value={(step.commands || []).join('\n')}
              onChange={(e) => {
                const cmds = e.target.value.split('\n').filter((c) => c.trim());
                update('commands', cmds.length > 0 ? cmds : undefined);
              }}
              placeholder="/qualia-new-project"
              rows={3}
              className="font-mono text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Tips (one per line)
            </label>
            <Textarea
              value={(step.tips || []).join('\n')}
              onChange={(e) => {
                const tips = e.target.value.split('\n').filter((t) => t.trim());
                update('tips', tips.length > 0 ? tips : undefined);
              }}
              placeholder="Helpful tips for this step"
              rows={3}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Example Title
            </label>
            <Input
              value={step.exampleTitle || ''}
              onChange={(e) => update('exampleTitle', e.target.value || undefined)}
              placeholder="Example: STATE.md"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Example Content
            </label>
            <Textarea
              value={step.example || ''}
              onChange={(e) => update('example', e.target.value || undefined)}
              placeholder="Code or file example"
              rows={4}
              className="font-mono text-xs"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={step.isMilestone || false}
              onChange={(e) => update('isMilestone', e.target.checked || undefined)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            Mark as milestone
          </label>
        </div>
      )}
    </div>
  );
}

// Checklist editor
function ChecklistEditor({
  checklist,
  onChange,
}: {
  checklist: Guide['checklist'];
  onChange: (updated: Guide['checklist']) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Checklist Title
        </label>
        <Input
          value={checklist.title}
          onChange={(e) => onChange({ ...checklist, title: e.target.value })}
          placeholder="Checklist title"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Items (one per line)
        </label>
        <Textarea
          value={checklist.items.join('\n')}
          onChange={(e) =>
            onChange({
              ...checklist,
              items: e.target.value.split('\n').filter((i) => i.trim()),
            })
          }
          rows={5}
          placeholder="One checklist item per line"
        />
      </div>
    </div>
  );
}

// Slide-over panel for guide detail
function GuidePanel({
  guide,
  onClose,
  isAdmin,
  onGuideUpdated,
}: {
  guide: Guide;
  onClose: () => void;
  isAdmin?: boolean;
  onGuideUpdated?: (updated: Guide) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const colors = categoryColors[guide.category];
  const Icon = categoryIcons[guide.category];

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState(guide.title);
  const [editSubtitle, setEditSubtitle] = useState(guide.subtitle);
  const [editSteps, setEditSteps] = useState<GuideStep[]>(guide.steps);
  const [editChecklist, setEditChecklist] = useState(guide.checklist);

  const startEditing = useCallback(() => {
    setEditTitle(guide.title);
    setEditSubtitle(guide.subtitle);
    setEditSteps(guide.steps.map((s) => ({ ...s })));
    setEditChecklist({ ...guide.checklist, items: [...guide.checklist.items] });
    setSaveError(null);
    setEditing(true);
  }, [guide]);

  const cancelEditing = () => {
    setEditing(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const result = await updateKnowledgeGuide({
        slug: guide.slug,
        title: editTitle,
        subtitle: editSubtitle,
        category: guide.category,
        projectType: guide.projectType,
        steps: editSteps,
        checklist: editChecklist,
      });

      if (!result.success) {
        setSaveError(result.error || 'Failed to save');
        return;
      }

      // Notify parent of update
      onGuideUpdated?.({
        ...guide,
        title: editTitle,
        subtitle: editSubtitle,
        steps: editSteps,
        checklist: editChecklist,
      });
      setEditing(false);
    } catch {
      setSaveError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const updateStep = (index: number, updated: GuideStep) => {
    setEditSteps((prev) => prev.map((s, i) => (i === index ? updated : s)));
  };

  const removeStep = (index: number) => {
    setEditSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const addStep = () => {
    setEditSteps((prev) => [
      ...prev,
      {
        id: `step-${Date.now()}`,
        title: '',
        description: '',
      },
    ]);
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editing) {
          cancelEditing();
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose, editing]);

  useEffect(() => {
    panelRef.current?.scrollTo(0, 0);
    setEditing(false);
  }, [guide.slug]);

  return (
    <>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/80"
        onClick={onClose}
      />
      <m.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
        className="elevation-3 fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-2xl flex-col border-l border-border bg-card"
      >
        <div className="relative shrink-0 border-b border-border px-6 pb-5 pt-6">
          <div
            className={cn(
              'pointer-events-none absolute inset-0 bg-gradient-to-b opacity-60',
              colors.gradient
            )}
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                  colors.bg
                )}
              >
                <Icon className={cn('h-5 w-5', colors.text)} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      colors.border,
                      colors.text
                    )}
                  >
                    {categoryLabels[guide.category]}
                  </span>
                  <span className="text-xs text-muted-foreground/60">
                    {editing ? editSteps.length : guide.steps.length} steps
                  </span>
                </div>
                {editing ? (
                  <div className="mt-1.5 space-y-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-lg font-bold"
                      placeholder="Guide title"
                    />
                    <Input
                      value={editSubtitle}
                      onChange={(e) => setEditSubtitle(e.target.value)}
                      placeholder="Guide subtitle"
                    />
                  </div>
                ) : (
                  <>
                    <h2 className="mt-1.5 text-xl font-bold tracking-tight text-foreground">
                      {guide.title}
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">{guide.subtitle}</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {isAdmin && !editing && (
                <button
                  onClick={startEditing}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  title="Edit guide"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              {editing && (
                <>
                  <Button variant="ghost" size="sm" onClick={cancelEditing}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Save
                  </Button>
                </>
              )}
              <button
                onClick={editing ? cancelEditing : onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {saveError && (
            <div className="relative mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {saveError}
            </div>
          )}
        </div>

        <div ref={panelRef} className="flex-1 overflow-y-auto">
          <div className="px-6 py-6">
            {editing ? (
              /* ─── Edit Mode ─── */
              <div className="space-y-6">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Steps</h3>
                    <button
                      type="button"
                      onClick={addStep}
                      className="flex items-center gap-1 rounded-lg border border-dashed border-primary/30 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
                    >
                      <Plus className="h-3 w-3" />
                      Add Step
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editSteps.map((step, index) => (
                      <StepEditor
                        key={step.id}
                        step={step}
                        index={index}
                        onChange={(updated) => updateStep(index, updated)}
                        onRemove={() => removeStep(index)}
                      />
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">Checklist</h3>
                  <ChecklistEditor checklist={editChecklist} onChange={setEditChecklist} />
                </div>
              </div>
            ) : (
              /* ─── Read Mode ─── */
              <>
                <div className="space-y-0">
                  {guide.steps.map((step, index) => (
                    <StepCard
                      key={step.id}
                      step={step}
                      index={index}
                      total={guide.steps.length}
                      accentColor={colors.accent}
                    />
                  ))}
                </div>

                <div className="mt-8">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    {guide.checklist.title}
                  </div>
                  <div className="mt-3 rounded-xl border border-border bg-muted/20 p-4">
                    <ul className="space-y-2.5">
                      {guide.checklist.items.map((item, i) => (
                        <m.li
                          key={i}
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.04 }}
                          className="flex items-start gap-3 text-[13px]"
                        >
                          <div className="bg-primary/8 mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border border-primary/20">
                            <Check className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-muted-foreground">{item}</span>
                        </m.li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </m.div>
    </>
  );
}

export function KnowledgePageClient({ initialData, isAdmin }: KnowledgePageClientProps) {
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [guides, setGuides] = useState(initialData.allGuides);
  const [seeding, setSeeding] = useState(false);
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false);

  const filteredGuides = guides.filter((guide) => {
    const matchesSearch =
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleLifecycleStepClick = (slug: string) => {
    const guide = guides.find((g) => g.slug === slug);
    if (guide) setSelectedGuide(guide);
  };

  const handleGuideUpdated = (updated: Guide) => {
    setGuides((prev) => prev.map((g) => (g.slug === updated.slug ? updated : g)));
    setSelectedGuide(updated);
  };

  const seedGuides = async (force: boolean) => {
    setSeeding(true);
    try {
      const result = await seedKnowledgeGuides({ force });
      if (result.success) {
        const nextGuides = force ? defaultGuides : guides;
        setGuides(nextGuides);
        setSelectedGuide(nextGuides[0] || null);
      }
    } finally {
      setSeeding(false);
    }
  };

  const handleSeed = async () => {
    if (guides.length > 0) {
      setSeedConfirmOpen(true);
      return;
    }

    await seedGuides(false);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <PageHeader
        icon={<BookOpen className="h-3.5 w-3.5 text-primary" />}
        iconBg="bg-primary/10"
        title="Knowledge Base"
        className="shrink-0"
      >
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-50"
              title="Sync guides to database for editing"
            >
              {seeding ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Database className="h-3 w-3" />
              )}
              Sync to DB
            </button>
          )}
          <span className="text-xs text-muted-foreground/50">{guides.length} guides</span>
        </div>
      </PageHeader>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          {/* Lifecycle Pipeline */}
          <LifecyclePipeline onStepClick={handleLifecycleStepClick} />

          {/* Search + Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                placeholder="Search guides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'all', label: 'All' },
                { key: 'foundations', label: 'Foundations', icon: Layers },
                { key: 'lifecycle', label: 'Lifecycle', icon: GitBranch },
                { key: 'operations', label: 'Operations', icon: Wrench },
                { key: 'reference', label: 'Reference', icon: FileText },
                { key: 'checklist', label: 'Checklists', icon: ListChecks },
              ].map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150',
                    selectedCategory === cat.key
                      ? cat.key === 'all'
                        ? 'border-primary/30 bg-primary/10 text-primary dark:text-primary'
                        : `${categoryColors[cat.key].border} ${categoryColors[cat.key].bg} ${categoryColors[cat.key].text}`
                      : 'border-border bg-transparent text-muted-foreground/60 hover:bg-muted/30 hover:text-muted-foreground'
                  )}
                >
                  {cat.icon && <cat.icon className="h-3 w-3" />}
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Guides by category */}
          <div className="space-y-8">
            {(selectedCategory === 'all'
              ? ['foundations', 'lifecycle', 'operations', 'reference', 'checklist']
              : [selectedCategory]
            ).map((category) => {
              const categoryGuides = filteredGuides.filter((g) => g.category === category);
              if (categoryGuides.length === 0) return null;
              const Icon = categoryIcons[category];
              const colors = categoryColors[category];

              return (
                <div key={category} className="rounded-xl border border-border bg-card">
                  <div className="border-b border-border px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-lg',
                          colors.bg
                        )}
                      >
                        <Icon className={cn('h-3.5 w-3.5', colors.text)} />
                      </div>
                      <div>
                        <h2 className="text-[clamp(1.25rem,1.1rem+0.75vw,1.625rem)] font-semibold tracking-tight text-foreground">
                          {categoryLabels[category]}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {categoryDescriptions[category]}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-border">
                    {categoryGuides.map((guide) => (
                      <button
                        key={guide.slug}
                        onClick={() => setSelectedGuide(guide)}
                        className="group flex w-full cursor-pointer items-center gap-3 rounded-lg p-4 text-left transition-colors duration-150 hover:bg-muted/30"
                      >
                        <div
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                            colors.bg
                          )}
                        >
                          <Icon className={cn('h-3.5 w-3.5', colors.text)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[15px] font-semibold text-foreground">
                            {guide.title}
                          </h3>
                          <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                            {guide.subtitle}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-muted-foreground">
                              {guide.steps.length}
                            </span>{' '}
                            steps
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {filteredGuides.length === 0 && (
              <EmptyState
                icon={BookOpen}
                title="No guides found"
                description="Try adjusting your search or filter."
                minimal
              />
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedGuide && (
          <GuidePanel
            guide={selectedGuide}
            onClose={() => setSelectedGuide(null)}
            isAdmin={isAdmin}
            onGuideUpdated={handleGuideUpdated}
          />
        )}
      </AnimatePresence>
      <ConfirmDialog
        open={seedConfirmOpen}
        onOpenChange={setSeedConfirmOpen}
        title="Re-seed knowledge guides?"
        description={`This will replace all ${guides.length} existing guides with the latest file-backed guide set.`}
        confirmLabel="Re-seed"
        variant="destructive"
        onConfirm={() => {
          setSeedConfirmOpen(false);
          void seedGuides(true);
        }}
      />
    </div>
  );
}
