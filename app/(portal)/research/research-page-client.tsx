'use client';

import { useState, useCallback, useMemo } from 'react';
import { format, isThisWeek } from 'date-fns';
import { m, AnimatePresence } from '@/lib/lazy-motion';
import {
  FlaskConical,
  Plus,
  Search,
  Calendar,
  User,
  Download,
  Trash2,
  Eye,
  FileText,
  Lightbulb,
  CheckCircle2,
  Link2,
  Save,
  Target,
  BarChart3,
  Bot,
  Mic,
  Handshake,
  BookOpen,
  TrendingUp,
  DollarSign,
  ExternalLink,
  Globe,
  Clock,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { RichText } from '@/components/ui/rich-text';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { RESEARCH_CATEGORIES, CATEGORY_COLORS, getCategoryLabel } from '@/lib/research-constants';
import {
  createResearchEntry,
  deleteResearchEntry,
  type ResearchEntry,
  type CreateResearchInput,
} from '@/app/actions/research';
import { toast } from 'sonner';

interface ResearchPageClientProps {
  initialEntries: ResearchEntry[];
}

/* ─── Category → Icon mapping ───────────────────────────────── */
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  lead_generation: Target,
  competitor_analysis: BarChart3,
  ai_tools: Bot,
  voice_ai: Mic,
  partnerships: Handshake,
  industry_research: BookOpen,
  marketing: TrendingUp,
  pricing: DollarSign,
  general: FlaskConical,
};

const CATEGORY_ACCENT: Record<string, string> = {
  lead_generation: 'bg-green-500',
  competitor_analysis: 'bg-red-500',
  ai_tools: 'bg-purple-500',
  voice_ai: 'bg-blue-500',
  partnerships: 'bg-amber-500',
  industry_research: 'bg-cyan-500',
  marketing: 'bg-pink-500',
  pricing: 'bg-emerald-500',
  general: 'bg-muted-foreground/30',
};

/* ─── Source Links renderer ─────────────────────────────────── */
function SourceLinks({ text }: { text: string }) {
  const lines = text.split('\n').filter((l) => l.trim());
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/;

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const match = line.match(urlRegex);
        if (match) {
          const url = match[1].replace(/[.,;:!?)]+$/, '');
          const label = line
            .replace(match[1], '')
            .replace(/^[-•*]\s*/, '')
            .replace(/^\d+[.)]\s*/, '')
            .trim();
          let domain = '';
          try {
            domain = new URL(url).hostname.replace('www.', '');
          } catch {
            domain = url;
          }

          return (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3 transition-all hover:border-primary/20 hover:bg-muted/40"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{label || domain}</p>
                <p className="truncate text-xs text-muted-foreground">{domain}</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </a>
          );
        }
        // Non-URL line — render as text
        return (
          <p key={i} className="text-sm text-muted-foreground">
            {line}
          </p>
        );
      })}
    </div>
  );
}

/* ─── Research Card ─────────────────────────────────────────── */
function ResearchCard({
  entry,
  onView,
  onDelete,
}: {
  entry: ResearchEntry;
  onView: () => void;
  onDelete: () => void;
}) {
  const colors = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.general;
  const CategoryIcon = CATEGORY_ICONS[entry.category] || FlaskConical;
  const accent = CATEGORY_ACCENT[entry.category] || 'bg-muted-foreground/30';

  const sourceCount = entry.sources ? (entry.sources.match(/https?:\/\//g) || []).length : 0;
  const hasFindings = !!entry.key_findings;
  const hasActions = !!entry.action_items;

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="ease-[cubic-bezier(0.16,1,0.3,1)] group relative overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:border-primary/20 hover:shadow-md"
    >
      {/* Category accent line */}
      <div className={cn('h-0.5', accent)} />

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Category icon */}
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              colors.bg
            )}
          >
            <CategoryIcon className={cn('h-5 w-5', colors.text)} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  colors.bg,
                  colors.text,
                  colors.border
                )}
              >
                {getCategoryLabel(entry.category)}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(new Date(entry.research_date), 'MMM d, yyyy')}
              </span>
            </div>

            <h3 className="mb-1 text-[15px] font-semibold leading-snug text-foreground">
              {entry.title}
            </h3>
            <p className="text-sm text-muted-foreground">{entry.topic}</p>

            {entry.summary && (
              <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground/80">
                {entry.summary}
              </p>
            )}

            {/* Metadata indicators */}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {entry.author && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  {entry.author.full_name || entry.author.email}
                </span>
              )}
              {sourceCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                  <Link2 className="h-3 w-3" />
                  {sourceCount} source{sourceCount !== 1 ? 's' : ''}
                </span>
              )}
              {hasFindings && (
                <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <Lightbulb className="h-3 w-3" />
                  Findings
                </span>
              )}
              {hasActions && (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Actions
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="relative z-10 flex shrink-0 items-center gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onView}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <button
        onClick={onView}
        className="absolute inset-0 z-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
        aria-label={`View ${entry.title}`}
      />
    </m.div>
  );
}

/* ─── Section helper ────────────────────────────────────────── */
function Section({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: React.ElementType;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className={cn('h-4 w-4', color)} />
        {title}
      </h3>
      {children}
    </div>
  );
}

/* ─── Research Detail Modal ─────────────────────────────────── */
function ResearchDetailModal({
  entry,
  open,
  onClose,
}: {
  entry: ResearchEntry | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!entry) return null;

  const colors = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.general;
  const CategoryIcon = CATEGORY_ICONS[entry.category] || FlaskConical;
  const accent = CATEGORY_ACCENT[entry.category] || 'bg-muted-foreground/30';

  const handleDownloadMarkdown = () => {
    const markdown = `# ${entry.title}

**Topic:** ${entry.topic}
**Category:** ${getCategoryLabel(entry.category)}
**Date:** ${format(new Date(entry.research_date), 'MMMM d, yyyy')}
**Author:** ${entry.author?.full_name || entry.author?.email || 'Unknown'}

---

## Summary
${entry.summary || 'No summary provided.'}

## Key Findings
${entry.key_findings || 'No key findings recorded.'}

## Action Items
${entry.action_items || 'No action items recorded.'}

## Sources
${entry.sources || 'No sources provided.'}

${entry.raw_content ? `## Raw Research Content\n${entry.raw_content}` : ''}
`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-${entry.research_date}-${entry.category}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Research downloaded as Markdown');
  };

  // Count sections that have content
  const sectionCount = [
    entry.summary,
    entry.key_findings,
    entry.action_items,
    entry.sources,
  ].filter(Boolean).length;

  const hasRightColumn = !!entry.action_items || !!entry.sources;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="elevation-2 flex max-h-[90vh] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-xl bg-card p-0 sm:max-w-[1100px]">
        <div className={cn('h-1 shrink-0', accent)} />

        {/* Sticky header */}
        <div className="shrink-0 border-b border-border px-6 pb-5 pt-6 sm:px-8">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn('flex h-11 w-11 items-center justify-center rounded-xl', colors.bg)}
                >
                  <CategoryIcon className={cn('h-5 w-5', colors.text)} />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold">{entry.title}</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    {entry.topic}
                  </DialogDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadMarkdown}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  colors.bg,
                  colors.text,
                  colors.border
                )}
              >
                {getCategoryLabel(entry.category)}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(new Date(entry.research_date), 'MMMM d, yyyy')}
              </span>
              {entry.author && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  {entry.author.full_name || entry.author.email}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Layers className="h-3 w-3" />
                {sectionCount} section{sectionCount !== 1 ? 's' : ''}
              </span>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          {hasRightColumn ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-5">
                {entry.summary && (
                  <Section icon={FileText} title="Summary" color="text-blue-500">
                    <RichText className="text-muted-foreground">{entry.summary}</RichText>
                  </Section>
                )}
                {entry.key_findings && (
                  <Section icon={Lightbulb} title="Key Findings" color="text-amber-500">
                    <RichText className="text-muted-foreground">{entry.key_findings}</RichText>
                  </Section>
                )}
                {entry.raw_content && <RawContentSection content={entry.raw_content} />}
              </div>
              <div className="space-y-5">
                {entry.action_items && (
                  <Section icon={CheckCircle2} title="Action Items" color="text-green-500">
                    <RichText className="text-muted-foreground">{entry.action_items}</RichText>
                  </Section>
                )}
                {entry.sources && (
                  <Section icon={Link2} title="Sources & References" color="text-purple-500">
                    <SourceLinks text={entry.sources} />
                  </Section>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {entry.summary && (
                <Section icon={FileText} title="Summary" color="text-blue-500">
                  <RichText className="text-muted-foreground">{entry.summary}</RichText>
                </Section>
              )}
              {entry.key_findings && (
                <Section icon={Lightbulb} title="Key Findings" color="text-amber-500">
                  <RichText className="text-muted-foreground">{entry.key_findings}</RichText>
                </Section>
              )}
              {entry.action_items && (
                <Section icon={CheckCircle2} title="Action Items" color="text-green-500">
                  <RichText className="text-muted-foreground">{entry.action_items}</RichText>
                </Section>
              )}
              {entry.sources && (
                <Section icon={Link2} title="Sources & References" color="text-purple-500">
                  <SourceLinks text={entry.sources} />
                </Section>
              )}
              {entry.raw_content && <RawContentSection content={entry.raw_content} />}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Collapsible Raw Content ───────────────────────────────── */
function RawContentSection({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full cursor-pointer items-center justify-between text-sm font-semibold text-foreground"
      >
        <span className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Raw Research Content
        </span>
        <ChevronDown
          className={cn(
            'ease-[cubic-bezier(0.16,1,0.3,1)] h-4 w-4 text-muted-foreground transition-transform duration-200',
            expanded && 'rotate-180'
          )}
        />
      </button>
      {expanded && (
        <div className="mt-3 max-h-64 overflow-y-auto rounded-lg bg-muted p-4">
          <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-muted-foreground">
            {content}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Form Section Divider ──────────────────────────────────── */
function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="border-b border-border/50 pb-2">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

/* ─── New Research Modal ────────────────────────────────────── */
function NewResearchModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (entry: ResearchEntry) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateResearchInput>({
    title: '',
    topic: '',
    category: 'general',
    summary: '',
    key_findings: '',
    action_items: '',
    sources: '',
    raw_content: '',
    research_date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.topic.trim()) {
      toast.error('Title and topic are required');
      return;
    }

    setIsSubmitting(true);
    const result = await createResearchEntry(formData);
    setIsSubmitting(false);

    if (result.success && result.data) {
      toast.success('Research entry logged');
      onSuccess(result.data);
      setFormData({
        title: '',
        topic: '',
        category: 'general',
        summary: '',
        key_findings: '',
        action_items: '',
        sources: '',
        raw_content: '',
        research_date: new Date().toISOString().split('T')[0],
      });
      onClose();
    } else {
      toast.error(result.error || 'Failed to create research entry');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90vh] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-xl bg-card p-0 sm:max-w-[800px]">
        {/* Sticky header */}
        <div className="shrink-0 border-b border-border bg-muted/30 px-6 py-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <FlaskConical className="h-4 w-4 text-primary" />
              </div>
              Log Research
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record findings from Deep Research, NotebookLM, or your own investigation.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-6">
              {/* Section 1: What did you research? */}
              <FormSection title="What did you research?">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="title"
                      className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g. AI Tools for Lead Generation"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="topic"
                      className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      Topic <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="topic"
                      placeholder="e.g. New AI tools and platforms"
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="category"
                      className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      Category
                    </Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {RESEARCH_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="research_date"
                      className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      Date
                    </Label>
                    <Input
                      id="research_date"
                      type="date"
                      value={formData.research_date}
                      onChange={(e) => setFormData({ ...formData, research_date: e.target.value })}
                    />
                  </div>
                </div>
              </FormSection>

              {/* Section 2: Summary */}
              <FormSection title="Summary" description="What did you find? Give a brief overview.">
                <Textarea
                  id="summary"
                  placeholder="Brief summary of what you discovered and why it matters..."
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  rows={4}
                  className="resize-none"
                />
              </FormSection>

              {/* Section 3: Findings & follow-up */}
              <FormSection title="Findings & Follow-up" description="Key takeaways and next steps.">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="key_findings"
                      className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      <Lightbulb className="h-3 w-3 text-amber-500" />
                      Key Findings
                    </Label>
                    <Textarea
                      id="key_findings"
                      placeholder="- Finding one&#10;- Finding two&#10;- Finding three"
                      value={formData.key_findings}
                      onChange={(e) => setFormData({ ...formData, key_findings: e.target.value })}
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="action_items"
                      className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Action Items
                    </Label>
                    <Textarea
                      id="action_items"
                      placeholder="- Try out tool X&#10;- Share with team&#10;- Schedule follow-up"
                      value={formData.action_items}
                      onChange={(e) => setFormData({ ...formData, action_items: e.target.value })}
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                </div>
              </FormSection>

              {/* Section 4: Sources & references */}
              <FormSection
                title="Sources & References"
                description="Paste links, one per line. They'll be rendered as clickable cards."
              >
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="sources"
                      className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      <Link2 className="h-3 w-3 text-purple-500" />
                      Source URLs
                    </Label>
                    <Textarea
                      id="sources"
                      placeholder="https://example.com/article&#10;https://github.com/repo&#10;Tool Name https://tool.com"
                      value={formData.sources}
                      onChange={(e) => setFormData({ ...formData, sources: e.target.value })}
                      rows={3}
                      className="resize-none font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="raw_content"
                      className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      Raw Output
                      <span className="normal-case tracking-normal text-muted-foreground">
                        (optional — paste full AI output)
                      </span>
                    </Label>
                    <Textarea
                      id="raw_content"
                      placeholder="Paste the full Gemini/NotebookLM output here for reference..."
                      value={formData.raw_content}
                      onChange={(e) => setFormData({ ...formData, raw_content: e.target.value })}
                      rows={3}
                      className="resize-none font-mono text-xs"
                    />
                  </div>
                </div>
              </FormSection>
            </div>
          </div>

          {/* Sticky footer */}
          <div className="flex shrink-0 items-center justify-between border-t border-border px-6 py-4">
            <p className="text-xs text-muted-foreground">
              <span className="text-destructive">*</span> Required fields
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Research
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export function ResearchPageClient({ initialEntries }: ResearchPageClientProps) {
  const [entries, setEntries] = useState<ResearchEntry[]>(initialEntries);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedEntry, setSelectedEntry] = useState<ResearchEntry | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [confirmState, setConfirmState] = useState<{ action: () => void } | null>(null);

  // Stats
  const stats = useMemo(() => {
    const thisWeek = entries.filter((e) => {
      try {
        return isThisWeek(new Date(e.research_date));
      } catch {
        return false;
      }
    });
    const categories = new Set(entries.map((e) => e.category));
    return { total: entries.length, thisWeek: thisWeek.length, categories: categories.size };
  }, [entries]);

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || entry.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleNewEntry = useCallback((entry: ResearchEntry) => {
    setEntries((prev) => [entry, ...prev]);
  }, []);

  const handleDelete = useCallback((entry: ResearchEntry) => {
    setConfirmState({
      action: async () => {
        const result = await deleteResearchEntry(entry.id);
        if (result.success) {
          setEntries((prev) => prev.filter((e) => e.id !== entry.id));
          toast.success('Research entry deleted');
        } else {
          toast.error(result.error || 'Failed to delete entry');
        }
      },
    });
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <PageHeader icon={<FlaskConical className="h-3.5 w-3.5 text-primary" />} title="Research">
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Log Research
        </Button>
      </PageHeader>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6 lg:p-8">
          {/* Stats row */}
          {entries.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="relative rounded-xl border border-border bg-card p-5">
                <FlaskConical className="absolute right-4 top-4 h-5 w-5 text-muted-foreground/20" />
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Total Entries
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {stats.total}
                </p>
              </div>
              <div className="relative rounded-xl border border-border bg-card p-5">
                <Clock className="absolute right-4 top-4 h-5 w-5 text-muted-foreground/20" />
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  This Week
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {stats.thisWeek}
                </p>
              </div>
              <div className="relative rounded-xl border border-border bg-card p-5">
                <Layers className="absolute right-4 top-4 h-5 w-5 text-muted-foreground/20" />
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Categories
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {stats.categories}
                </p>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search research..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {RESEARCH_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150',
                selectedCategory === 'all'
                  ? 'border-primary/30 bg-primary/15 text-primary dark:text-primary'
                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50'
              )}
            >
              All ({entries.length})
            </button>
            {RESEARCH_CATEGORIES.map((cat) => {
              const count = entries.filter((e) => e.category === cat.value).length;
              if (count === 0) return null;
              const colors = CATEGORY_COLORS[cat.value] || CATEGORY_COLORS.general;
              const CatIcon = CATEGORY_ICONS[cat.value] || FlaskConical;
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={cn(
                    'flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150',
                    selectedCategory === cat.value
                      ? `${colors.border} ${colors.bg} ${colors.text}`
                      : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  <CatIcon className="h-3 w-3" />
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Research Entries */}
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
              <FlaskConical className="mb-3 h-12 w-12 text-muted-foreground/30" />
              <h3 className="text-base font-medium text-foreground">No research entries yet</h3>
              <p className="mb-4 mt-1 text-center text-sm text-muted-foreground">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try adjusting your filters or search terms'
                  : 'Log your first research findings from Deep Research, NotebookLM, or your own investigation'}
              </p>
              {!searchQuery && selectedCategory === 'all' && (
                <Button onClick={() => setShowNewModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Log Research
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {filteredEntries.map((entry) => (
                  <ResearchCard
                    key={entry.id}
                    entry={entry}
                    onView={() => setSelectedEntry(entry)}
                    onDelete={() => handleDelete(entry)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ResearchDetailModal
        entry={selectedEntry}
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />

      <NewResearchModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSuccess={handleNewEntry}
      />

      <ConfirmDialog
        open={!!confirmState}
        onOpenChange={(open) => !open && setConfirmState(null)}
        title="Delete Research Entry"
        description="Are you sure? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          confirmState?.action();
          setConfirmState(null);
        }}
      />
    </div>
  );
}
