'use client';

import { useState, type ReactNode } from 'react';
import { Settings, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/sidebar-provider';

interface SettingsSection {
  id: string;
  label: string;
  content: ReactNode;
  danger?: boolean;
}

interface SettingsLayoutProps {
  sections: SettingsSection[];
}

export function SettingsLayout({ sections }: SettingsLayoutProps) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id || '');
  const { toggleMobile } = useSidebar();

  const currentSection = sections.find((s) => s.id === activeSection) || sections[0];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/40 bg-card/80 px-6 py-4 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-2.5">
          <Button variant="ghost" size="icon" className="size-8 lg:hidden" onClick={toggleMobile}>
            <Menu className="size-4" />
          </Button>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
            <Settings className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <h1 className="text-sm font-semibold text-foreground">Settings</h1>
        </div>
      </header>

      {/* Content: Sidebar + Main */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Mobile: Horizontal scrollable tabs */}
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border/40 bg-card/50 px-4 py-2 md:hidden">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                activeSection === section.id
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
                section.danger && activeSection === section.id && 'bg-red-500/10 text-red-500'
              )}
            >
              {section.label}
            </button>
          ))}
        </div>

        {/* Desktop: Sidebar nav */}
        <nav className="hidden w-[200px] shrink-0 flex-col border-r border-border/40 bg-card/30 p-4 md:flex">
          <div className="space-y-0.5">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-all',
                  activeSection === section.id
                    ? 'bg-primary/8 border-l-2 border-primary text-foreground'
                    : 'border-l-2 border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                  section.danger &&
                    activeSection === section.id &&
                    'bg-red-500/8 border-red-500 text-red-500',
                  section.danger && activeSection !== section.id && 'text-red-400/70'
                )}
              >
                {section.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Main content area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-2xl">
            <div
              className={cn(
                'rounded-lg border bg-card p-6',
                currentSection?.danger ? 'border-red-900/50' : 'border-border'
              )}
            >
              <h2
                className={cn(
                  'text-md mb-4 font-medium',
                  currentSection?.danger ? 'text-red-400' : 'text-foreground'
                )}
              >
                {currentSection?.label}
              </h2>
              {currentSection?.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
