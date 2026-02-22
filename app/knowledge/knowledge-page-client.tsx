'use client';

import { useState } from 'react';
import { BookOpen, Zap, Flame, Terminal, ChevronRight, Check, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
};

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  greenfield: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
  },
  brownfield: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
  },
  workflow: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
  },
};

function GuideStepItem({ step, index }: { step: GuideStep; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'group relative rounded-lg border p-4 transition-all hover:shadow-md',
        step.isMilestone
          ? 'border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent'
          : 'border-border/50 bg-muted/20 hover:bg-muted/30'
      )}
    >
      {step.warning && (
        <div className="mb-3 flex items-start gap-2 rounded-md bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
          <Flame className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="font-medium">{step.warning}</p>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
            step.isMilestone
              ? 'bg-amber-500 text-amber-950'
              : 'bg-qualia-500/15 text-qualia-600 dark:text-qualia-400'
          )}
        >
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-foreground">{step.title}</h4>
          {step.description && (
            <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
          )}

          {step.commands && step.commands.length > 0 && (
            <div className="mt-3 space-y-2">
              {step.commands.map((cmd, i) => (
                <div
                  key={i}
                  className="group/code relative flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 font-mono text-sm text-slate-300"
                >
                  <Terminal className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  <span className="flex-1 truncate">{cmd}</span>
                </div>
              ))}
            </div>
          )}

          {step.tips && step.tips.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {step.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-qualia-500" />
                  <span className="italic">{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
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
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-gradient-to-r from-background via-background to-background/95 px-4 backdrop-blur-sm sm:px-6">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-qualia-500/20 to-qualia-500/5 shadow-sm"
          >
            <BookOpen className="h-5 w-5 text-qualia-500" />
          </motion.div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Knowledge Hub</h1>
            <p className="text-xs text-muted-foreground">
              {initialData.allGuides.length} workflow guides
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search guides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                selectedCategory === 'all'
                  ? 'border-qualia-500/30 bg-qualia-500/15 text-qualia-600 dark:text-qualia-400'
                  : 'border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50'
              )}
            >
              All
            </button>
            {['greenfield', 'brownfield', 'workflow'].map((cat) => {
              const Icon = categoryIcons[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-all',
                    selectedCategory === cat
                      ? categoryColors[cat].border +
                          ' ' +
                          categoryColors[cat].bg +
                          ' ' +
                          categoryColors[cat].text
                      : 'border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Guides View */}
          <div className="space-y-6">
            {selectedCategory === 'all' ? (
              <>
                {['greenfield', 'brownfield', 'workflow'].map((category) => {
                  const categoryGuides = filteredGuides.filter((g) => g.category === category);
                  if (categoryGuides.length === 0) return null;
                  const Icon = categoryIcons[category];
                  const colors = categoryColors[category];

                  return (
                    <div key={category} className="space-y-3">
                      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        <Icon className={cn('h-4 w-4', colors.text)} />
                        {category}
                      </h2>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {categoryGuides.map((guide) => (
                          <motion.button
                            key={guide.slug}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => setSelectedGuide(guide)}
                            className={cn(
                              'flex flex-col items-start gap-2 rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-4 text-left transition-all hover:border-border/80 hover:shadow-md',
                              colors.bg
                            )}
                          >
                            <div className="flex w-full items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-medium text-foreground">{guide.title}</h3>
                                <p className="text-xs text-muted-foreground">{guide.subtitle}</p>
                              </div>
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-xs font-medium',
                                  colors.border,
                                  colors.text
                                )}
                              >
                                {guide.steps.length} steps
                              </span>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="space-y-3">
                {filteredGuides.map((guide) => (
                  <motion.button
                    key={guide.slug}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelectedGuide(guide)}
                    className={cn(
                      'flex w-full flex-col items-start gap-2 rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-4 text-left transition-all hover:border-border/80 hover:shadow-md',
                      categoryColors[guide.category]?.bg || 'bg-muted/10'
                    )}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-foreground">{guide.title}</h3>
                        <p className="text-xs text-muted-foreground">{guide.subtitle}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide Detail Modal */}
      <Dialog open={!!selectedGuide} onOpenChange={() => setSelectedGuide(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          {selectedGuide && (
            <>
              <DialogHeader className="border-b border-border/40 pb-4">
                <DialogTitle className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl',
                      categoryColors[selectedGuide.category]?.bg
                    )}
                  >
                    {(() => {
                      const Icon = categoryIcons[selectedGuide.category];
                      return (
                        <Icon
                          className={cn('h-5 w-5', categoryColors[selectedGuide.category]?.text)}
                        />
                      );
                    })()}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{selectedGuide.title}</h2>
                    <p className="text-sm font-normal text-muted-foreground">
                      {selectedGuide.subtitle}
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div>
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Steps
                  </h3>
                  <div className="space-y-3">
                    {selectedGuide.steps.map((step, index) => (
                      <GuideStepItem key={step.id} step={step} index={index} />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {selectedGuide.checklist.title}
                  </h3>
                  <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                    <ul className="space-y-2">
                      {selectedGuide.checklist.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-qualia-500/10">
                            <Check className="h-3 w-3 text-qualia-500" />
                          </div>
                          <span className="text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
