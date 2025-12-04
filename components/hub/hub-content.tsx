'use client';

import { useState } from 'react';
import { TasksPanel } from './tasks-panel';
import { ChatPanel } from './chat-panel';
import { UpdatesPanel } from './updates-panel';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HubContentProps {
  workspaceId: string;
}

export function HubContent({ workspaceId }: HubContentProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Hub</h1>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Dashboard Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {/* Tasks Section - Takes up 2 columns on large screens */}
            <div className="flex flex-col gap-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">My Tasks</h2>
              </div>
              <div className="h-[500px] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <TasksPanel workspaceId={workspaceId} />
              </div>
            </div>

            {/* Updates Section - Takes up 1 column */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Recent Updates</h2>
              </div>
              <div className="h-[500px] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <UpdatesPanel workspaceId={workspaceId} />
              </div>
            </div>

            {/* Quick Actions / Summary (Placeholder for future expansion) */}
            <div className="lg:col-span-3">{/* Potential area for more widgets */}</div>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div
          className={cn(
            'flex flex-col overflow-hidden border-l border-border bg-card transition-all duration-300 ease-in-out',
            isChatOpen ? 'w-[400px] translate-x-0' : 'w-0 translate-x-full opacity-0'
          )}
        >
          <div className="flex items-center justify-between border-b border-border p-4">
            <h3 className="font-semibold">AI Assistant</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatPanel workspaceId={workspaceId} />
          </div>
        </div>
      </div>
    </div>
  );
}
