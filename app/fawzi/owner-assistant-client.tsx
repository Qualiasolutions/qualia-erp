'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Bot, History, Lock, LogOut, MessageSquare, Mic, Plus, FileText } from 'lucide-react';
import { AIAssistantChat } from '@/components/ai-assistant/ai-assistant-chat';
import { AIAssistantProvider, useAIAssistant } from '@/components/ai-assistant';
import type { AssistantMode } from '@/components/ai-assistant/ai-assistant-provider';
import { ConversationSidebar } from '@/components/ai-assistant/conversation-sidebar';
import { cn } from '@/lib/utils';

const modeConfig: Record<AssistantMode, { label: string; icon: typeof MessageSquare }> = {
  voice: { label: 'Voice', icon: Mic },
  chat: { label: 'Chat', icon: MessageSquare },
  document: { label: 'Docs', icon: FileText },
};

function OwnerAssistantShell({ onLogout }: { onLogout: () => void }) {
  const { conversationId, mode, setMode, loadConversation, newConversation, open } =
    useAIAssistant();
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    open();
    setMode('voice');
  }, [open, setMode]);

  return (
    <div className="flex h-dvh min-h-dvh flex-col bg-background text-foreground">
      <header className="flex min-h-16 items-center justify-between border-b border-border bg-background/95 px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Bot className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">Qualia</h1>
            <p className="truncate text-xs text-muted-foreground">Fawzi private assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowHistory((value) => !value)}
            className={cn(
              'flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors',
              showHistory ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
            )}
            aria-label="Sessions"
          >
            <History className="size-4" />
          </button>
          <button
            type="button"
            onClick={newConversation}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="New session"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Lock"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <div className="flex border-b border-border bg-muted/20 px-2 py-2 sm:px-5">
        <div className="grid w-full grid-cols-3 rounded-lg border border-border bg-background p-1 sm:max-w-sm">
          {(Object.entries(modeConfig) as [AssistantMode, (typeof modeConfig)['voice']][]).map(
            ([key, config]) => {
              const Icon = config.icon;
              const isActive = mode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={cn(
                    'flex min-h-9 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="size-3.5" />
                  {config.label}
                </button>
              );
            }
          )}
        </div>
      </div>

      <main className="relative grid min-h-0 flex-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 border-r border-border bg-card lg:block">
          <ConversationSidebar
            activeConversationId={conversationId}
            onSelectConversation={loadConversation}
            onNewConversation={newConversation}
            onClose={() => setShowHistory(false)}
          />
        </aside>

        {showHistory && (
          <div className="absolute inset-0 z-20 bg-background lg:hidden">
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
          </div>
        )}

        <section className="min-h-0">
          <AIAssistantChat />
        </section>
      </main>
    </div>
  );
}

function OwnerLogin({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const response = await fetch('/api/owner-assistant/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    setIsSubmitting(false);
    if (!response.ok) {
      setError('Wrong code');
      return;
    }

    onAuthenticated();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-elevation-2"
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Lock className="size-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Qualia</h1>
            <p className="text-xs text-muted-foreground">Private access</p>
          </div>
        </div>

        <label className="mb-2 block text-xs font-medium text-muted-foreground" htmlFor="code">
          Code
        </label>
        <input
          id="code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          autoFocus
          className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
        />

        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting || !code.trim()}
          className="mt-4 flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Checking...' : 'Unlock'}
        </button>
      </form>
    </main>
  );
}

export function OwnerAssistantClient() {
  const [status, setStatus] = useState<'checking' | 'locked' | 'ready'>('checking');

  useEffect(() => {
    fetch('/api/owner-assistant/session')
      .then((response) => response.json())
      .then((data: { authenticated?: boolean }) => {
        setStatus(data.authenticated ? 'ready' : 'locked');
      })
      .catch(() => setStatus('locked'));
  }, []);

  async function handleLogout() {
    await fetch('/api/owner-assistant/session', { method: 'DELETE' });
    setStatus('locked');
  }

  if (status === 'checking') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background text-foreground">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </main>
    );
  }

  if (status === 'locked') {
    return <OwnerLogin onAuthenticated={() => setStatus('ready')} />;
  }

  return (
    <AIAssistantProvider>
      <OwnerAssistantShell onLogout={handleLogout} />
    </AIAssistantProvider>
  );
}
