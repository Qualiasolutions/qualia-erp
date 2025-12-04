'use client';

import { TasksPanel } from './tasks-panel';
import { ChatPanel } from './chat-panel';
import { UpdatesPanel } from './updates-panel';
import { MessageSquare } from 'lucide-react';

interface HubContentProps {
  workspaceId: string;
}

export function HubContent({ workspaceId }: HubContentProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-qualia-600/10 p-2">
            <MessageSquare className="h-4 w-4 text-qualia-500" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Hub</h1>
            <p className="text-xs text-muted-foreground">Tasks, chat & updates</p>
          </div>
        </div>
      </header>

      {/* 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Tasks Panel - Left */}
        <div className="w-[320px] flex-shrink-0 overflow-hidden border-r border-border">
          <TasksPanel workspaceId={workspaceId} />
        </div>

        {/* Chat Panel - Center */}
        <div className="flex-1 overflow-hidden">
          <ChatPanel workspaceId={workspaceId} />
        </div>

        {/* Updates Panel - Right */}
        <div className="w-[300px] flex-shrink-0 overflow-hidden border-l border-border">
          <UpdatesPanel workspaceId={workspaceId} />
        </div>
      </div>
    </div>
  );
}
