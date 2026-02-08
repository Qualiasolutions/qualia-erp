'use client';

import { useState, useTransition, useMemo } from 'react';
import {
  format,
  parseISO,
  isSameDay,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  subDays,
  isWeekend,
} from 'date-fns';
import {
  Plus,
  RefreshCw,
  Check,
  Edit,
  Trash2,
  FlaskConical,
  Calendar,
  ChevronRight,
  ExternalLink,
  X,
  Flame,
  Hash,
  Clock,
  BarChart3,
  Target,
  Search,
  Sparkles,
  Globe,
  Mic,
  Handshake,
  FileText,
  DollarSign,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import {
  type ResearchFinding,
  type ResearchTask,
  createResearchFinding,
  updateResearchFinding,
  deleteResearchFinding,
} from '@/app/actions/research';
import {
  type ResearchCategory,
  RESEARCH_CATEGORIES,
  CATEGORY_LABELS,
} from '@/lib/research-constants';
import { useResearchFindings, useResearchTasks, invalidateResearchFindings } from '@/lib/swr';
import { motion, AnimatePresence } from 'framer-motion';
import { ResearchAnalytics } from './analytics-page';

interface ResearchPageClientProps {
  initialFindings: ResearchFinding[];
  initialTasks: ResearchTask[];
}

// Category icons for visual distinction
const CATEGORY_ICONS: Record<ResearchCategory, React.ElementType> = {
  lead_generation: Target,
  competitor_analysis: Search,
  ai_tools: Sparkles,
  voice_ai_trends: Mic,
  partnerships: Handshake,
  industry_deep_dive: BookOpen,
  seo_content: FileText,
  pricing_strategies: DollarSign,
};

// Category color gradients for modern feel
const CATEGORY_GRADIENTS: Record<
  ResearchCategory,
  { from: string; to: string; bg: string; text: string; border: string }
> = {
  lead_generation: {
    from: 'from-amber-500/20',
    to: 'to-orange-500/10',
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
  },
  competitor_analysis: {
    from: 'from-violet-500/20',
    to: 'to-purple-500/10',
    bg: 'bg-violet-500/10',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/30',
  },
  ai_tools: {
    from: 'from-teal-500/20',
    to: 'to-cyan-500/10',
    bg: 'bg-teal-500/10',
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-500/30',
  },
  voice_ai_trends: {
    from: 'from-pink-500/20',
    to: 'to-rose-500/10',
    bg: 'bg-pink-500/10',
    text: 'text-pink-600 dark:text-pink-400',
    border: 'border-pink-500/30',
  },
  partnerships: {
    from: 'from-sky-500/20',
    to: 'to-blue-500/10',
    bg: 'bg-sky-500/10',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-500/30',
  },
  industry_deep_dive: {
    from: 'from-emerald-500/20',
    to: 'to-green-500/10',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
  },
  seo_content: {
    from: 'from-orange-500/20',
    to: 'to-amber-500/10',
    bg: 'bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500/30',
  },
  pricing_strategies: {
    from: 'from-indigo-500/20',
    to: 'to-blue-500/10',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-500/30',
  },
};

// Stagger animation for list items
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

function DynamicList({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState('');

  const addItem = () => {
    const trimmed = draft.trim();
    if (trimmed) {
      onChange([...items, trimmed]);
      setDraft('');
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground/80">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
          className="h-9 transition-colors focus:bg-accent/50"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="h-9 shrink-0 transition-all hover:scale-105"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <AnimatePresence mode="popLayout">
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-1.5"
          >
            {items.map((item, i) => (
              <motion.div
                key={i}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="group flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-sm transition-colors hover:bg-muted/50"
              >
                <span className="flex-1 truncate">{item}</span>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                  className="shrink-0 opacity-60 transition-all hover:text-destructive hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ResearchPageClient({ initialFindings, initialTasks }: ResearchPageClientProps) {
  // SWR hooks for real-time data
  const { findings, revalidate: revalidateFindings } = useResearchFindings(initialFindings);
  const { tasks, revalidate: revalidateTasks } = useResearchTasks(initialTasks);

  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFinding, setEditingFinding] = useState<ResearchFinding | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<ResearchCategory | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'timeline' | 'analytics'>('timeline');

  // Form state for dynamic lists
  const [keyFindings, setKeyFindings] = useState<string[]>([]);
  const [actionItems, setActionItems] = useState<string[]>([]);
  const [sourceLinks, setSourceLinks] = useState<string[]>([]);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Today's task
  const todaysTask = useMemo(() => {
    return tasks.find((t) => t.due_date && isSameDay(parseISO(t.due_date), today));
  }, [tasks, today]);

  // Stats
  const stats = useMemo(() => {
    const total = findings.length;

    // Current streak (consecutive weekdays with an entry)
    let streak = 0;
    let checkDate = new Date(today);
    while (true) {
      // Skip weekends when counting back
      if (isWeekend(checkDate)) {
        checkDate = subDays(checkDate, 1);
        continue;
      }
      const hasEntry = findings.some(
        (f) => f.research_date && isSameDay(parseISO(f.research_date), checkDate)
      );
      if (hasEntry) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }

    // Unique categories covered
    const uniqueCategories = new Set(findings.map((f) => f.topic_category));

    // This week entries
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const thisWeek = findings.filter(
      (f) =>
        f.research_date &&
        isWithinInterval(parseISO(f.research_date), { start: weekStart, end: weekEnd })
    ).length;

    return { total, streak, topicsCovered: uniqueCategories.size, thisWeek };
  }, [findings, today]);

  // Filtered findings
  const filteredFindings = useMemo(() => {
    if (activeCategory === 'all') return findings;
    return findings.filter((f) => f.topic_category === activeCategory);
  }, [findings, activeCategory]);

  const openCreateModal = () => {
    setEditingFinding(null);
    setKeyFindings([]);
    setActionItems([]);
    setSourceLinks([]);
    setIsModalOpen(true);
  };

  const openEditModal = (finding: ResearchFinding) => {
    setEditingFinding(finding);
    setKeyFindings(finding.key_findings || []);
    setActionItems(finding.action_items || []);
    setSourceLinks(finding.source_links || []);
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData: FormData) => {
    // Inject dynamic list values as JSON
    formData.set('key_findings', JSON.stringify(keyFindings));
    formData.set('action_items', JSON.stringify(actionItems));
    formData.set('source_links', JSON.stringify(sourceLinks));

    // Handle checkboxes
    if (!formData.has('gemini_used')) formData.set('gemini_used', 'false');
    if (!formData.has('notebooklm_used')) formData.set('notebooklm_used', 'false');

    startTransition(async () => {
      if (editingFinding) {
        formData.set('id', editingFinding.id);
        await updateResearchFinding(formData);
      } else {
        await createResearchFinding(formData);
      }
      setIsModalOpen(false);
      setEditingFinding(null);
      invalidateResearchFindings(true);
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this research finding?')) return;
    startTransition(async () => {
      await deleteResearchFinding(id);
      invalidateResearchFindings(true);
    });
  };

  const handleRefresh = () => {
    revalidateFindings();
    revalidateTasks();
  };

  // Stat card component for consistency
  const StatCard = ({
    icon: Icon,
    label,
    value,
    suffix,
    delay = 0,
  }: {
    icon: React.ElementType;
    label: string;
    value: number;
    suffix?: string;
    delay?: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-4 transition-all hover:shadow-md hover:shadow-qualia-500/5"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-qualia-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-qualia-500/10 transition-colors group-hover:bg-qualia-500/15">
          <Icon className="h-5 w-5 text-qualia-500" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground/80">{label}</p>
          <p className="mt-0.5 text-xl font-semibold text-foreground">
            {value}
            {suffix && (
              <span className="ml-1 text-sm font-normal text-muted-foreground">{suffix}</span>
            )}
          </p>
        </div>
      </div>
    </motion.div>
  );

  // Category filter pill component
  const CategoryPill = ({
    category,
    label,
    icon: Icon,
  }: {
    category: ResearchCategory | 'all';
    label: string;
    icon?: React.ElementType;
  }) => {
    const isActive = activeCategory === category;
    const isAll = category === 'all';
    const colors = isAll
      ? {
          bg: 'bg-qualia-500/15',
          text: 'text-qualia-600 dark:text-qualia-400',
          border: 'border-qualia-500/30',
        }
      : CATEGORY_GRADIENTS[category as ResearchCategory];

    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setActiveCategory(category)}
        className={cn(
          'relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
          isActive
            ? `${colors.bg} ${colors.text} ${colors.border} border shadow-sm`
            : 'border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50'
        )}
      >
        {Icon && <Icon className="h-3 w-3" />}
        {label}
        {isActive && (
          <motion.div
            layoutId="activeCategory"
            className="absolute inset-0 rounded-full bg-inherit"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
          />
        )}
      </motion.button>
    );
  };

  // Research timeline item component
  const ResearchItem = ({ finding }: { finding: ResearchFinding }) => {
    const isExpanded = expandedId === finding.id;
    const category = finding.topic_category as ResearchCategory;
    const CategoryIcon = CATEGORY_ICONS[category];
    const colors = CATEGORY_GRADIENTS[category];

    return (
      <motion.div
        layout
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        exit={{ opacity: 0, height: 0 }}
        className="group overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:border-border/80"
      >
        {/* Category indicator bar */}
        <div
          className={cn(
            'absolute bottom-0 left-0 top-0 w-1 bg-gradient-to-b',
            colors.from,
            colors.to
          )}
        />

        {/* Collapsed header */}
        <button
          onClick={() => setExpandedId(isExpanded ? null : finding.id)}
          className="relative flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/30"
        >
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </motion.div>

          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              colors.bg
            )}
          >
            <CategoryIcon className={cn('h-4 w-4', colors.text)} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{finding.topic}</p>
            <p className="text-xs text-muted-foreground/70">
              {format(parseISO(finding.research_date), 'MMM d, yyyy')}
              {finding.time_spent_minutes && ` · ${finding.time_spent_minutes} min`}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {finding.gemini_used && (
              <Badge
                variant="outline"
                className="h-6 border-purple-500/30 bg-purple-500/5 px-1.5 text-[10px] text-purple-600 dark:text-purple-400"
              >
                Sparkles
              </Badge>
            )}
            {finding.notebooklm_used && (
              <Badge
                variant="outline"
                className="h-6 border-blue-500/30 bg-blue-500/5 px-1.5 text-[10px] text-blue-600 dark:text-blue-400"
              >
                BookOpen
              </Badge>
            )}
          </div>
        </button>

        {/* Expanded content */}
        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="ml-5 border-t border-border/40 bg-muted/20 px-5 pb-4 pt-3">
                {finding.summary && (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                    {finding.summary}
                  </p>
                )}

                {finding.key_findings.length > 0 && (
                  <div className="mt-4">
                    <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Hash className="h-3 w-3" />
                      Key Findings
                    </h4>
                    <ul className="mt-2.5 space-y-2">
                      {finding.key_findings.map((kf, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-start gap-2.5 text-sm"
                        >
                          <span
                            className={cn(
                              'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                              colors.text.replace('text', 'bg')
                            )}
                          />
                          <span className="flex-1">{kf}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}

                {finding.action_items.length > 0 && (
                  <div className="mt-4">
                    <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Check className="h-3 w-3 text-emerald-500" />
                      Action Items
                    </h4>
                    <ul className="mt-2.5 space-y-2">
                      {finding.action_items.map((ai, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + i * 0.05 }}
                          className="flex items-start gap-2.5 text-sm"
                        >
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                            <Check className="h-3 w-3 text-emerald-500" />
                          </div>
                          <span className="flex-1">{ai}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}

                {finding.source_links.length > 0 && (
                  <div className="mt-4">
                    <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <ExternalLink className="h-3 w-3" />
                      Sources
                    </h4>
                    <ul className="mt-2.5 space-y-1.5">
                      {finding.source_links.map((link, i) => (
                        <li key={i}>
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary/80 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <span className="max-w-[300px] truncate">{link}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/40 pt-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground/60">
                    {finding.time_spent_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {finding.time_spent_minutes} min
                      </span>
                    )}
                    {finding.gemini_used && (
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-purple-400" />
                        Gemini
                      </span>
                    )}
                    {finding.notebooklm_used && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3 text-blue-400" />
                        NotebookLM
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(finding)}
                      className="h-8 px-2.5 text-xs transition-colors hover:bg-accent"
                    >
                      <Edit className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(finding.id)}
                      className="h-8 px-2.5 text-xs text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Header with subtle gradient */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-gradient-to-r from-background via-background to-background/95 px-4 backdrop-blur-sm sm:px-6">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-qualia-500/20 to-qualia-500/5 shadow-sm"
          >
            <FlaskConical className="h-5 w-5 text-qualia-500" />
          </motion.div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Research Lab</h1>
            <p className="text-xs text-muted-foreground">
              {stats.total} entries · {stats.streak} day streak · {stats.topicsCovered}/8 topics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isPending}
            className="transition-colors hover:bg-accent"
          >
            <RefreshCw className={cn('h-4 w-4', isPending && 'animate-spin')} />
          </Button>
          <Button
            onClick={openCreateModal}
            size="sm"
            className="gap-1.5 shadow-sm shadow-qualia-500/10 transition-all hover:shadow-md hover:shadow-qualia-500/15"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Log Research</span>
            <span className="sm:hidden">Log</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
          {/* Today's Task Banner */}
          <AnimatePresence>
            {todaysTask && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-sm',
                  todaysTask.status === 'Done'
                    ? 'border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-transparent'
                    : 'border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent'
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      todaysTask.status === 'Done' ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                    )}
                  >
                    <Calendar
                      className={cn(
                        'h-4 w-4',
                        todaysTask.status === 'Done' ? 'text-emerald-500' : 'text-amber-500'
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Today&apos;s Research Task
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{todaysTask.title}</p>
                  </div>
                </div>
                <Badge
                  className={cn(
                    'shrink-0 whitespace-nowrap text-xs',
                    todaysTask.status === 'Done'
                      ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  )}
                  variant="outline"
                >
                  {todaysTask.status}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab Switcher */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'timeline' | 'analytics')}
          >
            <TabsList className="grid w-full max-w-[300px] grid-cols-2">
              <TabsTrigger value="timeline" className="gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Timeline View */}
          {activeTab === 'timeline' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Stats Row - Only show on timeline */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <StatCard icon={BarChart3} label="Total Entries" value={stats.total} delay={0} />
                <StatCard
                  icon={Flame}
                  label="Current Streak"
                  value={stats.streak}
                  suffix="days"
                  delay={0.05}
                />
                <StatCard
                  icon={Hash}
                  label="Topics Covered"
                  value={stats.topicsCovered}
                  suffix="/8"
                  delay={0.1}
                />
                <StatCard icon={Clock} label="This Week" value={stats.thisWeek} delay={0.15} />
              </div>

              {/* Category Filter - Improved with icons and better hover states */}
              <div className="flex flex-wrap gap-2">
                <CategoryPill category="all" label="All" icon={Globe} />
                {RESEARCH_CATEGORIES.map((cat) => (
                  <CategoryPill
                    key={cat}
                    category={cat}
                    label={CATEGORY_LABELS[cat]}
                    icon={CATEGORY_ICONS[cat]}
                  />
                ))}
              </div>

              {/* Research Timeline - Improved with animations */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Research Timeline
                    <span className="ml-2 text-xs font-normal opacity-60">
                      ({filteredFindings.length})
                    </span>
                  </h2>
                </div>

                <AnimatePresence mode="popLayout">
                  {filteredFindings.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <EmptyState
                        icon={FlaskConical}
                        title="No research entries yet"
                        description="Start by logging your first research finding from Gemini Deep Research or NotebookLM."
                        iconColor="text-qualia-400"
                        iconBgColor="bg-qualia-500/10"
                        action={
                          <Button onClick={openCreateModal} size="sm" className="gap-2">
                            <Plus className="h-4 w-4" />
                            Log Your First Finding
                          </Button>
                        }
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-3"
                    >
                      {filteredFindings.map((finding) => (
                        <ResearchItem key={finding.id} finding={finding} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* Analytics View */}
          {activeTab === 'analytics' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ResearchAnalytics findings={findings} />
            </motion.div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal - Improved with better spacing and visual hierarchy */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto sm:max-w-2xl">
          <DialogHeader className="border-b border-border/40 pb-4">
            <DialogTitle className="flex items-center gap-2.5">
              {editingFinding ? (
                <>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                    <Edit className="h-4 w-4 text-muted-foreground" />
                  </div>
                  Edit Research Finding
                </>
              ) : (
                <>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-qualia-500/15">
                    <FlaskConical className="h-4 w-4 text-qualia-500" />
                  </div>
                  Log Research Finding
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingFinding
                ? 'Update your research finding details'
                : 'Record your research from Gemini Deep Research + NotebookLM'}
            </DialogDescription>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-5 p-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="topic" className="text-sm font-medium">
                Topic
              </Label>
              <Input
                id="topic"
                name="topic"
                defaultValue={editingFinding?.topic}
                placeholder="What did you research?"
                required
                className="transition-colors focus:bg-accent/50"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="topic_category" className="text-sm font-medium">
                  Category
                </Label>
                <Select
                  name="topic_category"
                  defaultValue={editingFinding?.topic_category || 'ai_tools'}
                  required
                >
                  <SelectTrigger className="transition-colors focus:bg-accent/50">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESEARCH_CATEGORIES.map((cat) => {
                      const Icon = CATEGORY_ICONS[cat];
                      return (
                        <SelectItem key={cat} value={cat} className="flex items-center gap-2">
                          <Icon className="mr-2 h-4 w-4 opacity-70" />
                          {CATEGORY_LABELS[cat]}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="research_date" className="text-sm font-medium">
                  Date
                </Label>
                <Input
                  id="research_date"
                  name="research_date"
                  type="date"
                  defaultValue={editingFinding?.research_date || format(new Date(), 'yyyy-MM-dd')}
                  className="transition-colors focus:bg-accent/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary" className="text-sm font-medium">
                Summary
              </Label>
              <Textarea
                id="summary"
                name="summary"
                defaultValue={editingFinding?.summary || ''}
                placeholder="Brief summary of your research findings..."
                rows={5}
                className="resize-none transition-colors focus:bg-accent/50"
              />
            </div>

            <DynamicList
              label="Key Findings"
              items={keyFindings}
              onChange={setKeyFindings}
              placeholder="Add a key finding..."
            />

            <DynamicList
              label="Action Items"
              items={actionItems}
              onChange={setActionItems}
              placeholder="Add an action item..."
            />

            <DynamicList
              label="Source Links"
              items={sourceLinks}
              onChange={setSourceLinks}
              placeholder="https://..."
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="time_spent_minutes" className="text-sm font-medium">
                  Time Spent (minutes)
                </Label>
                <Input
                  id="time_spent_minutes"
                  name="time_spent_minutes"
                  type="number"
                  min="1"
                  defaultValue={editingFinding?.time_spent_minutes || ''}
                  placeholder="30"
                  className="transition-colors focus:bg-accent/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Tools Used</Label>
                <div className="flex flex-wrap gap-4 pt-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm transition-colors hover:text-foreground">
                    <input
                      type="checkbox"
                      name="gemini_used"
                      value="true"
                      defaultChecked={editingFinding?.gemini_used ?? true}
                      className="h-4 w-4 rounded border-border accent-qualia-500"
                    />
                    <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                    Gemini Deep Research
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm transition-colors hover:text-foreground">
                    <input
                      type="checkbox"
                      name="notebooklm_used"
                      value="true"
                      defaultChecked={editingFinding?.notebooklm_used ?? true}
                      className="h-4 w-4 rounded border-border accent-qualia-500"
                    />
                    <BookOpen className="h-3.5 w-3.5 text-blue-400" />
                    NotebookLM
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border/40 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="transition-colors"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="min-w-[100px] gap-1.5">
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </motion.div>
                    Saving...
                  </span>
                ) : editingFinding ? (
                  <>
                    <Check className="h-4 w-4" />
                    Update
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
