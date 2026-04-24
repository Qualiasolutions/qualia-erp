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
  CheckCircle2,
  Circle,
  Sparkles,
  Trophy,
  RotateCcw,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
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

/* ─── Learning path curriculum ──────────────────────────────── */
type CurriculumPart = {
  title: string;
  subtitle: string;
  branching?: boolean;
  lessons: string[]; // guide slugs
};

const CURRICULUM: CurriculumPart[] = [
  {
    title: 'Fundamentals',
    subtitle: 'Understand the system before you use it.',
    lessons: ['getting-started', 'how-projects-work', 'tools-and-services'],
  },
  {
    title: 'Your first project',
    subtitle: 'Pick one track. You can come back for the others.',
    branching: true,
    lessons: ['build-website', 'build-voice-agent', 'build-web-app'],
  },
  {
    title: 'Daily craft',
    subtitle: 'What every working day looks like.',
    lessons: ['daily-routine', 'design-quality'],
  },
  {
    title: 'Ship it',
    subtitle: 'Before you deploy to production.',
    lessons: ['shipping-checklist'],
  },
];

const REFERENCE_SLUGS = ['commands-reference'];

const PROGRESS_KEY = 'qualia-kb-progress-v1';

function totalCorePartsDone(completed: Set<string>): number {
  return CURRICULUM.reduce((acc, part) => {
    if (part.branching) {
      return acc + (part.lessons.some((s) => completed.has(s)) ? 1 : 0);
    }
    return acc + part.lessons.filter((s) => completed.has(s)).length;
  }, 0);
}

function totalCoreSteps(): number {
  return CURRICULUM.reduce((acc, part) => acc + (part.branching ? 1 : part.lessons.length), 0);
}

function findNextSlug(completed: Set<string>): string | null {
  for (const part of CURRICULUM) {
    if (part.branching) {
      if (!part.lessons.some((s) => completed.has(s))) return part.lessons[0];
      continue;
    }
    for (const slug of part.lessons) {
      if (!completed.has(slug)) return slug;
    }
  }
  return null;
}

/* ─── Lesson row ────────────────────────────────────────────── */
function LessonRow({
  guide,
  state,
  globalNumber,
  onOpen,
  onToggleComplete,
}: {
  guide: Guide;
  state: 'done' | 'current' | 'upcoming';
  globalNumber: number;
  onOpen: () => void;
  onToggleComplete: () => void;
}) {
  const Icon = categoryIcons[guide.category];
  const colors = categoryColors[guide.category];

  return (
    <div
      className={cn(
        'group relative flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors duration-150 ease-premium sm:p-5',
        state === 'current' && 'border-primary/40 shadow-sm ring-1 ring-primary/10',
        state === 'done' && 'border-border/60 bg-card/60',
        state === 'upcoming' && 'border-border'
      )}
    >
      {/* Checkbox-style completion toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete();
        }}
        className="relative z-10 shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-label={state === 'done' ? 'Mark incomplete' : 'Mark complete'}
      >
        {state === 'done' ? (
          <CheckCircle2 className="h-7 w-7 text-primary" />
        ) : state === 'current' ? (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary/50 bg-primary/5 text-[11px] font-bold text-primary">
            {globalNumber}
          </div>
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-transparent text-[11px] font-semibold text-muted-foreground/60">
            {globalNumber}
          </div>
        )}
      </button>

      {/* Body — clickable */}
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div
          className={cn(
            'hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:flex',
            colors.bg,
            state === 'done' && 'opacity-60'
          )}
        >
          <Icon className={cn('h-4 w-4', colors.text)} />
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              'text-[15px] font-semibold leading-snug text-foreground',
              state === 'done' && 'text-muted-foreground'
            )}
          >
            {guide.title}
          </h3>
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
            {guide.subtitle}
          </p>
        </div>
        <div className="hidden items-center gap-1 text-xs text-muted-foreground/60 sm:flex">
          {guide.steps.length} steps
          <ArrowRight className="ml-1 h-4 w-4 text-muted-foreground/40 transition-transform duration-150 group-hover:translate-x-0.5" />
        </div>
      </button>
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────────────── */
export function KnowledgePageClient({ initialData, isAdmin }: KnowledgePageClientProps) {
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [guides, setGuides] = useState(initialData.allGuides);
  const [seeding, setSeeding] = useState(false);
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  // Load progress from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.completed)) {
          setCompleted(new Set(parsed.completed.filter((s: unknown) => typeof s === 'string')));
        }
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  const persistCompleted = useCallback((next: Set<string>) => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ completed: [...next] }));
    } catch {
      // ignore
    }
  }, []);

  const toggleComplete = useCallback(
    (slug: string) => {
      setCompleted((prev) => {
        const next = new Set(prev);
        if (next.has(slug)) next.delete(slug);
        else next.add(slug);
        persistCompleted(next);
        return next;
      });
    },
    [persistCompleted]
  );

  const resetProgress = useCallback(() => {
    const empty = new Set<string>();
    setCompleted(empty);
    persistCompleted(empty);
  }, [persistCompleted]);

  const guideBySlug = useCallback((slug: string) => guides.find((g) => g.slug === slug), [guides]);

  const totalDone = mounted ? totalCorePartsDone(completed) : 0;
  const totalSteps = totalCoreSteps();
  const progressPct = totalSteps > 0 ? Math.round((totalDone / totalSteps) * 100) : 0;
  const allDone = totalDone === totalSteps && totalSteps > 0;
  const nextSlug = mounted ? findNextSlug(completed) : null;
  const nextGuide = nextSlug ? guideBySlug(nextSlug) : null;

  // Number lessons globally (1..N) with the branching part counted as one number,
  // but each track inside the branch still clickable.
  const lessonNumberMap = new Map<string, number>();
  {
    let counter = 0;
    for (const part of CURRICULUM) {
      if (part.branching) {
        counter += 1;
        for (const s of part.lessons) lessonNumberMap.set(s, counter);
      } else {
        for (const s of part.lessons) {
          counter += 1;
          lessonNumberMap.set(s, counter);
        }
      }
    }
  }

  const referenceGuides = guides.filter((g) => REFERENCE_SLUGS.includes(g.slug));

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

  const lessonStateFor = (slug: string): 'done' | 'current' | 'upcoming' => {
    if (completed.has(slug)) return 'done';
    if (slug === nextSlug) return 'current';
    return 'upcoming';
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <PageHeader
        icon={<BookOpen className="h-3.5 w-3.5 text-primary" />}
        iconBg="bg-primary/10"
        title="Learn Qualia"
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
        </div>
      </PageHeader>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-8 p-4 sm:p-6 lg:p-8">
          {/* Hero — Start where you are */}
          <section
            className={cn(
              'relative overflow-hidden rounded-2xl border p-6 sm:p-7',
              allDone
                ? 'border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-card'
                : 'border-border bg-gradient-to-br from-primary/5 via-card to-card'
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                {allDone ? (
                  <Trophy className="h-5 w-5 text-primary" />
                ) : (
                  <Sparkles className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {allDone
                    ? "You've covered the path"
                    : totalDone === 0
                      ? 'Start where you are'
                      : 'Keep going'}
                </h1>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {allDone
                    ? 'Come back any time to review a lesson or unlock the other tracks.'
                    : 'Work through the path in order. Each lesson builds on the last.'}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium tabular-nums text-foreground">
                  {mounted ? `${totalDone} of ${totalSteps} complete` : '—'}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {mounted ? `${progressPct}%` : ''}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: mounted ? `${progressPct}%` : '0%' }}
                />
              </div>
            </div>

            {/* Next lesson CTA */}
            {nextGuide && (
              <button
                onClick={() => setSelectedGuide(nextGuide)}
                className="mt-5 flex w-full items-center gap-3 rounded-xl border border-primary/20 bg-background/60 p-4 text-left transition-colors duration-150 hover:border-primary/40 hover:bg-background/80"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <ArrowRight className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Up next
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">{nextGuide.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {nextGuide.subtitle}
                  </p>
                </div>
              </button>
            )}

            {mounted && totalDone > 0 && (
              <button
                onClick={() => setResetConfirmOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                Reset my progress
              </button>
            )}
          </section>

          {/* The path — parts + lessons */}
          <div className="space-y-10">
            {CURRICULUM.map((part, partIdx) => {
              const partLessons = part.lessons
                .map((s) => guideBySlug(s))
                .filter((g): g is Guide => !!g);
              if (partLessons.length === 0) return null;

              const partDone = part.branching
                ? part.lessons.some((s) => completed.has(s))
                : part.lessons.every((s) => completed.has(s));

              return (
                <section key={part.title} className="space-y-3">
                  <header className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                        partDone
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground/70'
                      )}
                    >
                      {partDone ? <Check className="h-3.5 w-3.5" /> : partIdx + 1}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/80">
                        Part {partIdx + 1}
                      </h2>
                      <p className="text-base font-semibold text-foreground sm:text-lg">
                        {part.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{part.subtitle}</p>
                    </div>
                  </header>

                  {part.branching ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {partLessons.map((g) => {
                        const isDone = completed.has(g.slug);
                        return (
                          <div
                            key={g.slug}
                            className={cn(
                              'group relative flex flex-col rounded-xl border bg-card p-4 transition-colors duration-150',
                              isDone && 'border-primary/40 bg-primary/[0.03]'
                            )}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleComplete(g.slug);
                              }}
                              className="absolute right-3 top-3 shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/30"
                              aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
                            >
                              {isDone ? (
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground/40" />
                              )}
                            </button>
                            <button
                              onClick={() => setSelectedGuide(g)}
                              className="flex flex-1 flex-col text-left"
                            >
                              <div
                                className={cn(
                                  'flex h-8 w-8 items-center justify-center rounded-lg',
                                  categoryColors[g.category].bg
                                )}
                              >
                                {(() => {
                                  const I = categoryIcons[g.category];
                                  return (
                                    <I className={cn('h-4 w-4', categoryColors[g.category].text)} />
                                  );
                                })()}
                              </div>
                              <h3 className="mt-3 text-[14px] font-semibold leading-snug text-foreground">
                                {g.title}
                              </h3>
                              <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-muted-foreground">
                                {g.subtitle}
                              </p>
                              <span className="mt-3 inline-flex items-center gap-1 text-xs text-primary">
                                {isDone ? 'Review' : 'Open track'}
                                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <ol className="space-y-3">
                      {partLessons.map((g) => (
                        <li key={g.slug}>
                          <LessonRow
                            guide={g}
                            state={lessonStateFor(g.slug)}
                            globalNumber={lessonNumberMap.get(g.slug) || 0}
                            onOpen={() => setSelectedGuide(g)}
                            onToggleComplete={() => toggleComplete(g.slug)}
                          />
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              );
            })}
          </div>

          {/* Reference — always available */}
          {referenceGuides.length > 0 && (
            <section className="space-y-3 border-t border-border pt-8">
              <header>
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/80">
                  Reference
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Open any time — not part of the path.
                </p>
              </header>
              <div className="grid gap-2 sm:grid-cols-2">
                {referenceGuides.map((g) => {
                  const Icon = categoryIcons[g.category];
                  const colors = categoryColors[g.category];
                  return (
                    <button
                      key={g.slug}
                      onClick={() => setSelectedGuide(g)}
                      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors duration-150 hover:border-primary/20 hover:bg-muted/20"
                    >
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          colors.bg
                        )}
                      >
                        <Icon className={cn('h-4 w-4', colors.text)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-foreground">{g.title}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {g.subtitle}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform duration-150 group-hover:translate-x-0.5" />
                    </button>
                  );
                })}
              </div>
            </section>
          )}
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
      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Reset learning progress?"
        description="This clears the lessons you've marked complete. The guides stay — only your personal progress is cleared."
        confirmLabel="Reset"
        variant="destructive"
        onConfirm={() => {
          setResetConfirmOpen(false);
          resetProgress();
        }}
      />
    </div>
  );
}
