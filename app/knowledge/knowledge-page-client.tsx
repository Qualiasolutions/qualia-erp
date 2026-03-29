'use client';

import { useState, useEffect, useRef } from 'react';
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
  Terminal,
  Code2,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { m, AnimatePresence } from '@/lib/lazy-motion';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Guide, GuideStep } from '@/lib/guides-data';

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
    bg: 'bg-teal-500/8',
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-500/20',
    accent: 'bg-teal-500',
    gradient: 'from-teal-500/10 via-transparent to-transparent',
  },
  lifecycle: {
    bg: 'bg-violet-500/8',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/20',
    accent: 'bg-violet-500',
    gradient: 'from-violet-500/10 via-transparent to-transparent',
  },
  operations: {
    bg: 'bg-amber-500/8',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20',
    accent: 'bg-amber-500',
    gradient: 'from-amber-500/10 via-transparent to-transparent',
  },
  reference: {
    bg: 'bg-sky-500/8',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-500/20',
    accent: 'bg-sky-500',
    gradient: 'from-sky-500/10 via-transparent to-transparent',
  },
  checklist: {
    bg: 'bg-rose-500/8',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/20',
    accent: 'bg-rose-500',
    gradient: 'from-rose-500/10 via-transparent to-transparent',
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
    <div className="mb-6 rounded-xl border border-violet-500/15 bg-violet-500/[0.03] p-4">
      <div className="mb-2.5 text-center text-[11px] font-semibold uppercase tracking-widest text-violet-500/60">
        Build Lifecycle
      </div>
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        {steps.map((step, i) => (
          <div key={step.slug} className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onStepClick?.(step.slug)}
              className="group flex flex-col items-center gap-1 transition-all hover:scale-105"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10 text-[11px] font-bold text-violet-500 transition-colors group-hover:bg-violet-500/20 sm:h-9 sm:w-9 sm:text-xs">
                {step.icon}
              </div>
              <span className="text-[10px] font-medium text-muted-foreground/70 transition-colors group-hover:text-violet-500 sm:text-[11px]">
                {step.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div className="mt-[-14px] h-px w-3 bg-violet-500/20 sm:w-6" />
            )}
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
      className="group/cmd flex w-full items-center gap-2.5 rounded-lg border border-slate-800/60 bg-slate-950 px-3.5 py-2.5 text-left font-mono text-[13px] text-slate-300 transition-all hover:border-slate-700 hover:bg-slate-900"
    >
      <span className="text-slate-600">$</span>
      <span className="min-w-0 flex-1 break-all">{command}</span>
      <span className="shrink-0 text-slate-600 transition-colors group-hover/cmd:text-slate-400">
        {copied ? (
          <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
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
    <div className="mt-3 overflow-hidden rounded-lg border border-slate-800/60 bg-slate-950">
      {title && (
        <div className="flex items-center justify-between border-b border-slate-800/40 px-3.5 py-2">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <Code2 className="h-3 w-3" />
            {title}
          </span>
          <button
            onClick={handleCopy}
            className="text-slate-600 transition-colors hover:text-slate-400"
          >
            {copied ? (
              <CheckCheck className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </div>
      )}
      <pre className="overflow-x-auto px-3.5 py-3 font-mono text-[12px] leading-relaxed text-slate-300">
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
        <div
          className={cn(
            'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
            step.isMilestone
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
              : `${accentColor}/15 ${accentColor === 'bg-teal-500' ? 'text-teal-600 dark:text-teal-400' : accentColor === 'bg-violet-500' ? 'text-violet-600 dark:text-violet-400' : accentColor === 'bg-amber-500' ? 'text-amber-600 dark:text-amber-400' : accentColor === 'bg-sky-500' ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600 dark:text-rose-400'}`
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

// Slide-over panel for guide detail
function GuidePanel({ guide, onClose }: { guide: Guide; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const colors = categoryColors[guide.category];
  const Icon = categoryIcons[guide.category];

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    panelRef.current?.scrollTo(0, 0);
  }, [guide.slug]);

  return (
    <>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <m.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-2xl flex-col border-l border-border bg-background shadow-2xl"
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
                    {guide.steps.length} steps
                  </span>
                </div>
                <h2 className="mt-1.5 text-xl font-bold tracking-tight text-foreground">
                  {guide.title}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{guide.subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div ref={panelRef} className="flex-1 overflow-y-auto">
          <div className="px-6 py-6">
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
          </div>
        </div>
      </m.div>
    </>
  );
}

// Guide card for the listing
function GuideCard({
  guide,
  colors,
  onClick,
  index,
}: {
  guide: Guide;
  colors: (typeof categoryColors)[string];
  onClick: () => void;
  index: number;
}) {
  const Icon = categoryIcons[guide.category];
  const milestoneCount = guide.steps.filter((s) => s.isMilestone).length;
  const commandCount = guide.steps.reduce((sum, s) => sum + (s.commands?.length || 0), 0);
  const exampleCount = guide.steps.filter((s) => s.example).length;

  return (
    <m.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onClick={onClick}
      className={cn(
        'group relative flex flex-col rounded-xl border border-border bg-card p-5 text-left transition-all duration-200',
        'hover:border-border/70 hover:shadow-lg hover:shadow-black/5',
        'active:scale-[0.98]'
      )}
    >
      <div className={cn('absolute left-0 top-4 h-8 w-[3px] rounded-r-full', colors.accent)} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                colors.bg
              )}
            >
              <Icon className={cn('h-3.5 w-3.5', colors.text)} />
            </div>
            <h3 className="text-[15px] font-semibold text-foreground">{guide.title}</h3>
          </div>
          <p className="mt-1.5 pl-9 text-[13px] leading-relaxed text-muted-foreground">
            {guide.subtitle}
          </p>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
      </div>

      <div className="mt-3.5 flex items-center gap-3 pl-9">
        <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
          <span className="font-medium text-muted-foreground">{guide.steps.length}</span> steps
        </span>
        {commandCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
            <Terminal className="h-3 w-3" />
            <span className="font-medium text-muted-foreground">{commandCount}</span> commands
          </span>
        )}
        {exampleCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
            <Code2 className="h-3 w-3" />
            <span className="font-medium text-muted-foreground">{exampleCount}</span> examples
          </span>
        )}
        {milestoneCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-amber-500/60">
            <span className="font-medium text-amber-500">{milestoneCount}</span> milestones
          </span>
        )}
      </div>
    </m.button>
  );
}

export function KnowledgePageClient({ initialData }: KnowledgePageClientProps) {
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredGuides = initialData.allGuides.filter((guide) => {
    const matchesSearch =
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleLifecycleStepClick = (slug: string) => {
    const guide = initialData.allGuides.find((g) => g.slug === slug);
    if (guide) setSelectedGuide(guide);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <PageHeader
        icon={<BookOpen className="h-3.5 w-3.5 text-primary" />}
        iconBg="bg-primary/10"
        title="Knowledge Base"
        className="shrink-0"
      >
        <span className="text-xs text-muted-foreground/50">
          {initialData.allGuides.length} guides
        </span>
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
                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
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
                <div key={category}>
                  <div className="mb-3 flex items-center gap-2">
                    <div className={cn('h-px flex-1', colors.accent, 'opacity-15')} />
                    <div className="flex flex-col items-center gap-0.5">
                      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                        <Icon className={cn('h-3.5 w-3.5', colors.text)} />
                        {categoryLabels[category]}
                      </h2>
                      <span className="text-[10px] text-muted-foreground/40">
                        {categoryDescriptions[category]}
                      </span>
                    </div>
                    <div className={cn('h-px flex-1', colors.accent, 'opacity-15')} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {categoryGuides.map((guide, index) => (
                      <GuideCard
                        key={guide.slug}
                        guide={guide}
                        colors={colors}
                        onClick={() => setSelectedGuide(guide)}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {filteredGuides.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="mb-3 h-8 w-8 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground/60">No guides match your search</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedGuide && (
          <GuidePanel guide={selectedGuide} onClose={() => setSelectedGuide(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
