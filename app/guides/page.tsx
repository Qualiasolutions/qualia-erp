'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Globe,
  Bot,
  Phone,
  Layers,
  Sprout,
  TreeDeciduous,
  CheckCircle2,
  FlaskConical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { guides, type Guide, type GuideCategory, type ProjectType } from '@/lib/guides-data';

const PROJECT_TYPE_CONFIG: Record<
  ProjectType,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  website: { icon: Globe, color: 'text-sky-400 bg-sky-400/10' },
  'ai-agent': { icon: Bot, color: 'text-violet-400 bg-violet-400/10' },
  'voice-agent': { icon: Phone, color: 'text-pink-400 bg-pink-400/10' },
  'ai-platform': { icon: Layers, color: 'text-amber-400 bg-amber-400/10' },
  workflow: { icon: FlaskConical, color: 'text-teal-400 bg-teal-400/10' },
};

function getProgress(slug: string): { completed: number; total: number } {
  if (typeof window === 'undefined') return { completed: 0, total: 0 };
  try {
    const stored = localStorage.getItem(`guide-progress-${slug}`);
    const guide = guides.find((g) => g.slug === slug);
    if (!guide) return { completed: 0, total: 0 };
    const completed = stored ? JSON.parse(stored).length : 0;
    return { completed, total: guide.steps.length };
  } catch {
    return { completed: 0, total: 0 };
  }
}

function GuideCard({ guide }: { guide: Guide }) {
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const typeConfig = PROJECT_TYPE_CONFIG[guide.projectType];
  const TypeIcon = typeConfig.icon;

  useEffect(() => {
    setProgress(getProgress(guide.slug));
  }, [guide.slug]);

  const progressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
  const isComplete = progress.completed === progress.total && progress.total > 0;
  const hasProgress = progress.completed > 0;

  return (
    <Link
      href={`/guides/${guide.slug}`}
      className={cn(
        'group relative flex flex-col gap-3 rounded-xl border p-5 transition-all',
        'border-border/50 bg-card/50 hover:border-primary/30 hover:bg-card',
        'hover:shadow-[0_0_30px_rgba(var(--primary),0.1)]',
        isComplete && 'border-emerald-500/30'
      )}
    >
      {/* Progress indicator */}
      {hasProgress && (
        <div className="absolute bottom-0 left-0 h-1 overflow-hidden rounded-b-xl bg-muted">
          <div
            className={cn('h-full transition-all', isComplete ? 'bg-emerald-500' : 'bg-primary')}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      <div className="flex items-start justify-between">
        <div
          className={cn('flex h-10 w-10 items-center justify-center rounded-lg', typeConfig.color)}
        >
          <TypeIcon className="h-5 w-5" />
        </div>

        {isComplete && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
      </div>

      <div>
        <h3 className="font-semibold text-foreground transition-colors group-hover:text-primary">
          {guide.title
            .replace('Build a New ', '')
            .replace('Work on Existing ', '')
            .replace('Modify Existing ', '')}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{guide.subtitle}</p>
      </div>

      {hasProgress && (
        <div className="text-xs text-muted-foreground">
          {progress.completed}/{progress.total} steps
        </div>
      )}
    </Link>
  );
}

export default function GuidesPage() {
  const [activeCategory, setActiveCategory] = useState<GuideCategory>('greenfield');

  const greenfieldGuides = guides.filter((g) => g.category === 'greenfield');
  const brownfieldGuides = guides.filter((g) => g.category === 'brownfield');
  const workflowGuides = guides.filter((g) => g.category === 'workflow');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/30">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Qualia Guide Book</h1>
          <p className="mt-2 text-muted-foreground">
            Step-by-step guides for building projects. Click any guide to start - your progress is
            saved automatically.
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="border-b border-border/50">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveCategory('greenfield')}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                activeCategory === 'greenfield'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Sprout className="h-4 w-4" />
              Greenfield
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                New Projects
              </span>
            </button>
            <button
              onClick={() => setActiveCategory('brownfield')}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                activeCategory === 'brownfield'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <TreeDeciduous className="h-4 w-4" />
              Brownfield
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                Existing Projects
              </span>
            </button>
            <button
              onClick={() => setActiveCategory('workflow')}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                activeCategory === 'workflow'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <FlaskConical className="h-4 w-4" />
              Workflows
              <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-xs text-teal-400">
                Daily Habits
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-6 py-8">
        {activeCategory === 'greenfield' && (
          <div className="space-y-6">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Sprout className="h-5 w-5 text-emerald-500" />
                Starting Fresh
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Guides for creating new projects from scratch using our templates and best practices
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {greenfieldGuides.map((guide) => (
                <GuideCard key={guide.slug} guide={guide} />
              ))}
            </div>
          </div>
        )}

        {activeCategory === 'brownfield' && (
          <div className="space-y-6">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <TreeDeciduous className="h-5 w-5 text-amber-500" />
                Extending Existing Code
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Guides for adding features to existing codebases following established patterns
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {brownfieldGuides.map((guide) => (
                <GuideCard key={guide.slug} guide={guide} />
              ))}
            </div>
          </div>
        )}

        {activeCategory === 'workflow' && (
          <div className="space-y-6">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <FlaskConical className="h-5 w-5 text-teal-500" />
                Daily Workflows
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Step-by-step habits and routines to build consistency
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {workflowGuides.map((guide) => (
                <GuideCard key={guide.slug} guide={guide} />
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-12 rounded-xl border border-border/50 bg-card/30 p-6">
          <h3 className="font-semibold">Tips for Trainees</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/50" />
              Click the circle on each step to mark it complete - your progress is saved locally
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/50" />
              Click the copy button on code blocks to copy commands to your clipboard
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/50" />
              Yellow tips show example prompts - customize them for your specific project
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/50" />
              If stuck, ask in the team chat or message Fawzi
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
