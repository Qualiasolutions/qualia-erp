'use client';

import { useState } from 'react';
import { KanbanBoard } from './kanban-board';
import { NotificationsPanel } from './notifications-panel';
import { ActivityFeed } from './activity-feed';
import { Bell, Activity, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HubContentProps {
  workspaceId: string;
}

type RightPanelView = 'notifications' | 'activity';

export function HubContent({ workspaceId }: HubContentProps) {
  const [rightPanelView, setRightPanelView] = useState<RightPanelView>('notifications');

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card/50 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-qualia-500 to-qualia-600">
              <LayoutGrid className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-xl font-semibold">Hub</h1>
          </div>
          <div className="h-5 w-px bg-border" />
          <span className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Kanban Board - Main Area */}
        <div className="flex-1 overflow-hidden">
          <KanbanBoard workspaceId={workspaceId} />
        </div>

        {/* Right Panel - Notifications & Activity */}
        <div className="flex w-80 flex-col border-l border-border bg-card/30">
          {/* Panel Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setRightPanelView('notifications')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                rightPanelView === 'notifications'
                  ? 'border-b-2 border-qualia-500 text-qualia-500'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Bell className="h-4 w-4" />
              Notifications
            </button>
            <button
              onClick={() => setRightPanelView('activity')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                rightPanelView === 'activity'
                  ? 'border-b-2 border-qualia-500 text-qualia-500'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Activity className="h-4 w-4" />
              Activity
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-hidden">
            {rightPanelView === 'notifications' ? (
              <NotificationsPanel workspaceId={workspaceId} />
            ) : (
              <ActivityFeed workspaceId={workspaceId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
