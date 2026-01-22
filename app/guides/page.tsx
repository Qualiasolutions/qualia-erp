'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Globe,
  Bot,
  Phone,
  Layers,
  Sprout,
  TreeDeciduous,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type GuideCategory = 'greenfield' | 'brownfield';

interface Guide {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  category: GuideCategory;
}

const guides: Guide[] = [
  // Greenfield guides
  {
    id: 'greenfield-website',
    title: 'Website',
    description: 'Build a new website from scratch with Next.js, React, and Tailwind',
    icon: Globe,
    href: '/guides/greenfield-website.html',
    category: 'greenfield',
  },
  {
    id: 'greenfield-ai-agent',
    title: 'AI Agent',
    description: 'Create a new AI chatbot or assistant with Gemini and Supabase',
    icon: Bot,
    href: '/guides/greenfield-ai-agent.html',
    category: 'greenfield',
  },
  {
    id: 'greenfield-voice-agent',
    title: 'Voice Agent',
    description: 'Build a new voice AI agent with VAPI and ElevenLabs',
    icon: Phone,
    href: '/guides/greenfield-voice-agent.html',
    category: 'greenfield',
  },
  {
    id: 'greenfield-ai-platform',
    title: 'AI Platform',
    description: 'Create a full-featured AI platform with auth, database, and integrations',
    icon: Layers,
    href: '/guides/greenfield-ai-platform.html',
    category: 'greenfield',
  },
  // Brownfield guides
  {
    id: 'brownfield-website',
    title: 'Website',
    description: 'Add features to an existing website codebase',
    icon: Globe,
    href: '/guides/brownfield-website.html',
    category: 'brownfield',
  },
  {
    id: 'brownfield-ai-agent',
    title: 'AI Agent',
    description: 'Extend an existing AI agent with new capabilities',
    icon: Bot,
    href: '/guides/brownfield-ai-agent.html',
    category: 'brownfield',
  },
  {
    id: 'brownfield-voice-agent',
    title: 'Voice Agent',
    description: 'Enhance an existing voice agent with new features',
    icon: Phone,
    href: '/guides/brownfield-voice-agent.html',
    category: 'brownfield',
  },
  {
    id: 'brownfield-ai-platform',
    title: 'AI Platform',
    description: 'Add functionality to an existing AI platform',
    icon: Layers,
    href: '/guides/brownfield-ai-platform.html',
    category: 'brownfield',
  },
];

function GuideCard({ guide }: { guide: Guide }) {
  return (
    <a
      href={guide.href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group relative flex flex-col gap-3 rounded-xl border p-5 transition-all',
        'border-border/50 bg-card/50 hover:border-primary/30 hover:bg-card',
        'hover:shadow-[0_0_30px_rgba(var(--primary),0.1)]'
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            'bg-primary/10 text-primary'
          )}
        >
          <guide.icon className="h-5 w-5" />
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{guide.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{guide.description}</p>
      </div>
    </a>
  );
}

export default function GuidesPage() {
  const [activeCategory, setActiveCategory] = useState<GuideCategory>('greenfield');

  const greenfieldGuides = guides.filter((g) => g.category === 'greenfield');
  const brownfieldGuides = guides.filter((g) => g.category === 'brownfield');

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
            Step-by-step guides for building projects at Qualia Solutions
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
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">New Projects</span>
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
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Existing Projects</span>
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
                <GuideCard key={guide.id} guide={guide} />
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
                <GuideCard key={guide.id} guide={guide} />
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-12 rounded-xl border border-border/50 bg-card/30 p-6">
          <h3 className="font-semibold">Resources</h3>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <a
              href="/guides/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-primary"
            >
              <ExternalLink className="h-4 w-4" />
              Full Guide Index
            </a>
            <Link
              href="/projects"
              className="flex items-center gap-2 text-muted-foreground hover:text-primary"
            >
              View Active Projects
            </Link>
            <a
              href="https://github.com/qualia-solutions"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-primary"
            >
              <ExternalLink className="h-4 w-4" />
              GitHub Templates
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
