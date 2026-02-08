'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Globe,
  Bot,
  Phone,
  Layers,
  Sprout,
  TreeDeciduous,
  RotateCcw,
  CheckCircle2,
  FlaskConical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getGuideBySlug, type ProjectType } from '@/lib/guides-data';
import { GuideStepCard } from '@/components/guides/guide-step';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const PROJECT_TYPE_CONFIG: Record<
  ProjectType,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  website: { icon: Globe, color: 'text-sky-400 bg-sky-400/10', label: 'Website' },
  'ai-agent': { icon: Bot, color: 'text-violet-400 bg-violet-400/10', label: 'AI Agent' },
  'voice-agent': { icon: Phone, color: 'text-pink-400 bg-pink-400/10', label: 'Voice Agent' },
  'ai-platform': { icon: Layers, color: 'text-amber-400 bg-amber-400/10', label: 'Platform' },
  workflow: { icon: FlaskConical, color: 'text-teal-400 bg-teal-400/10', label: 'Workflow' },
};

function getStorageKey(slug: string) {
  return `guide-progress-${slug}`;
}

function loadProgress(slug: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(getStorageKey(slug));
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {
    // Ignore errors
  }
  return new Set();
}

function saveProgress(slug: string, completed: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(slug), JSON.stringify(Array.from(completed)));
  } catch {
    // Ignore errors
  }
}

interface GuidePageProps {
  params: Promise<{ slug: string }>;
}

export default function GuidePage({ params }: GuidePageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  const guide = getGuideBySlug(slug);

  // Load progress from localStorage on mount
  useEffect(() => {
    setCompletedSteps(loadProgress(slug));
    setMounted(true);
  }, [slug]);

  // Save progress when it changes
  useEffect(() => {
    if (mounted) {
      saveProgress(slug, completedSteps);
    }
  }, [slug, completedSteps, mounted]);

  if (!guide) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Guide Not Found</h1>
        <p className="text-muted-foreground">The guide &ldquo;{slug}&rdquo; doesn&apos;t exist.</p>
        <Button variant="outline" onClick={() => router.push('/guides')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Guides
        </Button>
      </div>
    );
  }

  const typeConfig = PROJECT_TYPE_CONFIG[guide.projectType];
  const TypeIcon = typeConfig.icon;
  const isGreenfield = guide.category === 'greenfield';

  const totalSteps = guide.steps.length;
  const completedCount = completedSteps.size;
  const progressPercent = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;
  const isAllComplete = completedCount === totalSteps;

  const toggleStepComplete = (stepId: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const resetProgress = () => {
    setCompletedSteps(new Set());
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/guides"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              All Guides
            </Link>

            <div className="flex items-center gap-3">
              {/* Progress */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {completedCount}/{totalSteps}
                </span>
                <div className="w-24">
                  <Progress value={progressPercent} className="h-2" />
                </div>
              </div>

              {/* Reset button */}
              {completedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetProgress}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Guide Content */}
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Title Section */}
        <div className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {/* Category badge */}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                isGreenfield
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-amber-500/10 text-amber-400'
              )}
            >
              {isGreenfield ? (
                <Sprout className="h-3 w-3" />
              ) : (
                <TreeDeciduous className="h-3 w-3" />
              )}
              {isGreenfield ? 'New Project' : 'Existing Project'}
            </span>

            {/* Type badge */}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                typeConfig.color
              )}
            >
              <TypeIcon className="h-3 w-3" />
              {typeConfig.label}
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight">{guide.title}</h1>
          <p className="mt-2 text-lg text-muted-foreground">{guide.subtitle}</p>
        </div>

        {/* Completion Banner */}
        {isAllComplete && (
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            <div>
              <p className="font-semibold text-emerald-400">All steps completed!</p>
              <p className="text-sm text-emerald-300/70">
                Great job! You&apos;ve finished this guide.
              </p>
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-4">
          {guide.steps.map((step, index) => (
            <GuideStepCard
              key={step.id}
              step={step}
              stepNumber={index + 1}
              isCompleted={completedSteps.has(step.id)}
              onToggleComplete={toggleStepComplete}
            />
          ))}
        </div>

        {/* Checklist */}
        <div className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
            <CheckCircle2 className="h-5 w-5" />
            {guide.checklist.title}
          </h3>
          <ul className="mt-4 space-y-2">
            {guide.checklist.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/50" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Navigation */}
        <div className="mt-10 flex justify-center">
          <Button variant="outline" onClick={() => router.push('/guides')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Guides
          </Button>
        </div>
      </div>
    </div>
  );
}
