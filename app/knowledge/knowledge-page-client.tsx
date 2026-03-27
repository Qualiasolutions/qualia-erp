'use client';

import { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Zap,
  Flame,
  Terminal,
  Check,
  Search,
  X,
  AlertTriangle,
  Lightbulb,
  Copy,
  CheckCheck,
  ClipboardList,
  ArrowRight,
  ListChecks,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { m, AnimatePresence } from '@/lib/lazy-motion';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Guide, GuideStep } from '@/lib/guides-data';

interface KnowledgeData {
  greenfieldGuides: Guide[];
  brownfieldGuides: Guide[];
  workflowGuides: Guide[];
  allGuides: Guide[];
}

interface KnowledgePageClientProps {
  initialData: KnowledgeData;
}

const categoryIcons: Record<string, React.ElementType> = {
  greenfield: Zap,
  brownfield: Flame,
  workflow: Terminal,
  checklist: ListChecks,
};

const categoryLabels: Record<string, string> = {
  greenfield: 'New Projects',
  brownfield: 'Existing Projects',
  workflow: 'Workflows & Tools',
  checklist: 'Shipping Checklists',
};

const categoryColors: Record<
  string,
  { bg: string; text: string; border: string; accent: string; gradient: string }
> = {
  greenfield: {
    bg: 'bg-emerald-500/8',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
    accent: 'bg-emerald-500',
    gradient: 'from-emerald-500/10 via-transparent to-transparent',
  },
  brownfield: {
    bg: 'bg-amber-500/8',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20',
    accent: 'bg-amber-500',
    gradient: 'from-amber-500/10 via-transparent to-transparent',
  },
  workflow: {
    bg: 'bg-blue-500/8',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20',
    accent: 'bg-blue-500',
    gradient: 'from-blue-500/10 via-transparent to-transparent',
  },
  checklist: {
    bg: 'bg-rose-500/8',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/20',
    accent: 'bg-rose-500',
    gradient: 'from-rose-500/10 via-transparent to-transparent',
  },
};

// Copyable command block
function CommandBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
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
              : `${accentColor}/15 ${accentColor === 'bg-emerald-500' ? 'text-emerald-600 dark:text-emerald-400' : accentColor === 'bg-amber-500' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`
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

  // Close on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Scroll to top when guide changes
  useEffect(() => {
    panelRef.current?.scrollTo(0, 0);
  }, [guide.slug]);

  return (
    <>
      {/* Backdrop */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <m.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-2xl flex-col border-l border-border bg-background shadow-2xl"
      >
        {/* Panel header */}
        <div className="relative shrink-0 border-b border-border px-6 pb-5 pt-6">
          {/* Category gradient */}
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
                    {guide.category}
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

        {/* Panel body — scrollable */}
        <div ref={panelRef} className="flex-1 overflow-y-auto">
          <div className="px-6 py-6">
            {/* Steps */}
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

            {/* Checklist */}
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
      {/* Category accent line */}
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

      {/* Stats */}
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
        {milestoneCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-amber-500/60">
            <Zap className="h-3 w-3" />
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

  // Filter guides
  const filteredGuides = initialData.allGuides.filter((guide) => {
    const matchesSearch =
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
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
            <div className="flex gap-1.5">
              {[
                { key: 'all', label: 'All' },
                { key: 'greenfield', label: 'New', icon: Zap },
                { key: 'brownfield', label: 'Existing', icon: Flame },
                { key: 'workflow', label: 'Workflow', icon: Terminal },
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
              ? ['greenfield', 'brownfield', 'workflow', 'checklist']
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
                    <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                      <Icon className={cn('h-3.5 w-3.5', colors.text)} />
                      {categoryLabels[category]}
                    </h2>
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

      {/* Guide Detail Panel (Slide-over) */}
      <AnimatePresence>
        {selectedGuide && (
          <GuidePanel guide={selectedGuide} onClose={() => setSelectedGuide(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
