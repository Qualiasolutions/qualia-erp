'use client';

import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group relative rounded-xl border border-border bg-gradient-to-br from-card to-card/50 p-5 transition-all hover:border-border/80 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
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

          <h3 className="mb-1 font-semibold text-foreground">{entry.title}</h3>
          <p className="text-sm text-muted-foreground">{entry.topic}</p>

          {entry.summary && (
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground/80">{entry.summary}</p>
          )}

          {entry.author && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{entry.author.full_name || entry.author.email}</span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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

      <button
        onClick={onView}
        className="absolute inset-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
        aria-label={`View ${entry.title}`}
      />
    </motion.div>
  );
}

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={cn('flex h-10 w-10 items-center justify-center rounded-xl', colors.bg)}
              >
                <FlaskConical className={cn('h-5 w-5', colors.text)} />
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
              Download
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
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
            <Section icon={Link2} title="Sources" color="text-purple-500">
              <RichText className="text-muted-foreground">{entry.sources}</RichText>
            </Section>
          )}

          {entry.raw_content && (
            <Section icon={FileText} title="Raw Research Content" color="text-gray-500">
              <div className="max-h-64 overflow-y-auto rounded-lg bg-muted/30 p-4">
                <p className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                  {entry.raw_content}
                </p>
              </div>
            </Section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className={cn('h-4 w-4', color)} />
        {title}
      </h3>
      {children}
    </div>
  );
}

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
      toast.success('Research entry logged successfully');
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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Log Research
          </DialogTitle>
          <DialogDescription>
            Record your daily research findings from Gemini Deep Research and NotebookLM.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="E.g., AI Tools for Lead Generation"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="research_date">Research Date</Label>
              <Input
                id="research_date"
                type="date"
                value={formData.research_date}
                onChange={(e) => setFormData({ ...formData, research_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic *</Label>
              <Input
                id="topic"
                placeholder="E.g., New AI tools and platforms"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              placeholder="Brief summary of the research findings..."
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="key_findings">Key Findings</Label>
            <Textarea
              id="key_findings"
              placeholder="• Finding 1&#10;• Finding 2&#10;• Finding 3"
              value={formData.key_findings}
              onChange={(e) => setFormData({ ...formData, key_findings: e.target.value })}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="action_items">Action Items</Label>
            <Textarea
              id="action_items"
              placeholder="• Action 1&#10;• Action 2&#10;• Action 3"
              value={formData.action_items}
              onChange={(e) => setFormData({ ...formData, action_items: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sources">Sources</Label>
            <Textarea
              id="sources"
              placeholder="Links to sources, references, or tools discovered..."
              value={formData.sources}
              onChange={(e) => setFormData({ ...formData, sources: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="raw_content">Raw Research Content (Optional)</Label>
            <Textarea
              id="raw_content"
              placeholder="Paste the full Gemini/NotebookLM output here for reference..."
              value={formData.raw_content}
              onChange={(e) => setFormData({ ...formData, raw_content: e.target.value })}
              rows={4}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ResearchPageClient({ initialEntries }: ResearchPageClientProps) {
  const [entries, setEntries] = useState<ResearchEntry[]>(initialEntries);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedEntry, setSelectedEntry] = useState<ResearchEntry | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

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

  const handleDelete = useCallback(async (entry: ResearchEntry) => {
    if (!confirm(`Delete "${entry.title}"? This cannot be undone.`)) return;

    const result = await deleteResearchEntry(entry.id);
    if (result.success) {
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      toast.success('Research entry deleted');
    } else {
      toast.error(result.error || 'Failed to delete entry');
    }
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-card/80 px-6 py-4 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-2.5">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"
          >
            <FlaskConical className="h-3.5 w-3.5 text-primary" />
          </motion.div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Research</h1>
          </div>
        </div>

        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Log Research
        </Button>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          {/* Search and Filters */}
          <div className="flex flex-col gap-4 sm:flex-row">
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
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
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
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                    selectedCategory === cat.value
                      ? `${colors.border} ${colors.bg} ${colors.text}`
                      : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Research Entries */}
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
              <FlaskConical className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="mb-2 font-medium text-foreground">No research entries yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Log your first research findings to get started'}
              </p>
              {!searchQuery && selectedCategory === 'all' && (
                <Button onClick={() => setShowNewModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Log Research
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
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
    </div>
  );
}
