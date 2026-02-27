'use client';

import { useEffect, useState } from 'react';
import { X, Minus, MessageSquare, Mic, FileText, Bot, FileStack, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIAssistant, AssistantMode } from './ai-assistant-provider';
import { AIAssistantChat } from './ai-assistant-chat';
import { AIAssistantVoice } from './ai-assistant-voice';
import { AIAssistantTemplates } from './ai-assistant-templates';
import { ConversationSidebar } from './conversation-sidebar';
import { useCurrentUser } from '@/hooks/use-current-user';

const modeConfig: Record<AssistantMode, { label: string; icon: typeof MessageSquare }> = {
  chat: { label: 'Chat', icon: MessageSquare },
  voice: { label: 'Voice', icon: Mic },
  document: { label: 'Docs', icon: FileText },
};

export function AIAssistantWidget() {
  const {
    isOpen,
    mode,
    showTemplates,
    conversationId,
    open,
    close,
    minimize,
    setMode,
    toggleTemplates,
    loadConversation,
    newConversation,
  } = useAIAssistant();
  const [showHistory, setShowHistory] = useState(false);
  const { user } = useCurrentUser();
  const userName = user?.fullName?.split(' ')[0] || 'User';

  // Keyboard shortcut: Cmd/Ctrl + J to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        if (isOpen) {
          close();
        } else {
          open();
        }
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, open, close]);

  return (
    <>
      {/* FAB - Floating Action Button */}
      {/* FAB - Floating Action Button Removed */}

      {/* Expanded Panel */}
      {isOpen && (
        <div
          className={cn(
            'fixed z-assistant',
            // Mobile: full screen
            'inset-0 md:inset-auto',
            // Desktop: bottom-right corner panel
            'md:bottom-6 md:right-6 md:h-[calc(100vh-8rem)] md:max-h-[600px] md:w-96',
            'flex flex-col overflow-hidden rounded-none bg-background shadow-2xl md:rounded-xl',
            'border-0 md:border md:border-border',
            'animate-scale-in'
          )}
        >
          {/* Header */}
          <div className="flex h-12 items-center justify-between border-b border-border bg-card/50 px-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-qualia-500/10 to-qualia-700/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">Qualia AI</span>
              <span className="text-[11px] text-muted-foreground">Cmd+J</span>
            </div>
            <div className="flex items-center gap-1">
              {/* History Toggle */}
              <button
                onClick={() => setShowHistory((prev) => !prev)}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                  showHistory
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                aria-label="Conversation history"
              >
                <History className="h-4 w-4" />
              </button>
              {/* Templates Toggle */}
              <button
                onClick={toggleTemplates}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                  showTemplates
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                aria-label="Toggle templates"
              >
                <FileStack className="h-4 w-4" />
              </button>
              {/* Minimize (desktop only) */}
              <button
                onClick={minimize}
                className="hidden h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:flex"
                aria-label="Minimize"
              >
                <Minus className="h-4 w-4" />
              </button>
              {/* Close */}
              <button
                onClick={close}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex border-b border-border bg-muted/30">
            {(Object.entries(modeConfig) as [AssistantMode, typeof modeConfig.chat][]).map(
              ([key, config]) => {
                const Icon = config.icon;
                const isActive = mode === key;
                return (
                  <button
                    key={key}
                    onClick={() => setMode(key)}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 py-2 text-xs transition-colors',
                      isActive
                        ? 'border-b-2 border-primary bg-background text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {config.label}
                  </button>
                );
              }
            )}
          </div>

          {/* Content Area */}
          <div className="relative flex-1 overflow-hidden">
            {/* History Sidebar (overlay) */}
            {showHistory && (
              <ConversationSidebar
                activeConversationId={conversationId}
                onSelectConversation={(id) => {
                  loadConversation(id);
                  setShowHistory(false);
                }}
                onNewConversation={() => {
                  newConversation();
                  setShowHistory(false);
                }}
                onClose={() => setShowHistory(false)}
              />
            )}

            {/* Templates Panel (overlay) */}
            {showTemplates && <AIAssistantTemplates />}

            {/* Mode Content */}
            <div className={cn('h-full', (showTemplates || showHistory) && 'invisible')}>
              {mode === 'voice' ? <AIAssistantVoice userName={userName} /> : <AIAssistantChat />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
