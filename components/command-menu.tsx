'use client';

import * as React from 'react';
import { Command } from 'cmdk';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import {
  Search,
  Plus,
  Settings,
  LayoutGrid,
  Folder,
  Building2,
  Calendar,
  Inbox,
  Sparkles,
  ArrowUp,
  Loader2,
  CheckSquare,
  CalendarPlus,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NewTaskModalControlled } from '@/components/new-task-modal';
import { NewMeetingModalControlled } from '@/components/new-meeting-modal';

type CommandMode = 'normal' | 'ai';

// Helper to check if an element is an input/editable
function isInputElement(target: EventTarget | null): boolean {
  if (!target) return false;
  const el = target as HTMLElement;
  return el.matches('input, textarea, select, [contenteditable="true"]');
}

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<CommandMode>('normal');
  const [inputValue, setInputValue] = React.useState('');
  const [showNewTaskModal, setShowNewTaskModal] = React.useState(false);
  const [showNewMeetingModal, setShowNewMeetingModal] = React.useState(false);
  const router = useRouter();
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // AI Chat integration
  const { messages, status, sendMessage, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    if (mode === 'ai') {
      scrollToBottom();
    }
  }, [messages, mode]);

  // Get text content from message parts
  const getMessageContent = React.useCallback((message: (typeof messages)[0]) => {
    if (!message.parts) return '';
    return message.parts
      .filter((part) => part.type === 'text')
      .map((part) => (part as { type: 'text'; text: string }).text)
      .join('');
  }, []);

  // Keyboard shortcuts
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // ⌘K - Open command palette (normal mode)
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (open && mode === 'normal') {
          handleClose();
        } else {
          setMode('normal');
          setInputValue('');
          setOpen(true);
        }
      }
      // ⌘J - Open command palette (AI mode)
      if (e.key === 'j' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (open && mode === 'ai') {
          handleClose();
        } else {
          setMode('ai');
          setInputValue('');
          setOpen(true);
        }
      }
      // Escape - Close
      if (e.key === 'Escape' && open) {
        handleClose();
      }

      // Global shortcuts (when not in command palette or input elements)
      if (!open && !isInputElement(e.target)) {
        // 'c' - Open New Task modal
        if (e.key === 'c') {
          e.preventDefault();
          setShowNewTaskModal(true);
        }
        // 'm' - Open New Meeting modal
        if (e.key === 'm') {
          e.preventDefault();
          setShowNewMeetingModal(true);
        }
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, mode]);

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, mode]);

  // Listen for openAIChat event from other components
  React.useEffect(() => {
    const handleOpenAIChat = (e: CustomEvent<{ query: string }>) => {
      setMode('ai');
      setInputValue(e.detail.query || '');
      setOpen(true);
    };

    window.addEventListener('openAIChat', handleOpenAIChat as EventListener);
    return () => window.removeEventListener('openAIChat', handleOpenAIChat as EventListener);
  }, []);

  const handleClose = () => {
    setOpen(false);
    setInputValue('');
  };

  const runCommand = React.useCallback((command: () => unknown) => {
    handleClose();
    command();
  }, []);

  // Handle input change - detect "ai:" prefix
  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (value.toLowerCase().startsWith('ai:') && mode === 'normal') {
      setMode('ai');
      setInputValue(value.slice(3).trim());
    }
  };

  // Handle AI message submission
  const handleAISubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      sendMessage({ text: inputValue });
      setInputValue('');
    }
  };

  // Switch to AI mode
  const switchToAI = () => {
    setMode('ai');
    setInputValue('');
  };

  // Clear AI chat
  const clearAIChat = () => {
    setMessages([]);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-command flex animate-fade-in items-start justify-center bg-foreground/40 pt-[15vh] backdrop-blur-[12px]"
      onClick={handleClose}
    >
      <div
        className="animate-modal-entrance w-full max-w-[560px] overflow-hidden rounded-2xl border border-border bg-card shadow-elevation-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mode indicator */}
        {mode === 'ai' && (
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>AI Assistant</span>
              {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearAIChat}
                  className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setMode('normal')}
                className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Normal command mode */}
        {mode === 'normal' && (
          <Command className="w-full">
            <div className="flex items-center border-b border-border px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground/50" />
              <Command.Input
                ref={inputRef}
                value={inputValue}
                onValueChange={handleInputChange}
                placeholder="Type a command or search... (ai: for AI)"
                className="flex h-10 w-full bg-transparent py-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              <kbd className="ml-2 shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                esc
              </kbd>
            </div>
            <Command.List className="max-h-[280px] overflow-y-auto p-1.5">
              <Command.Empty className="py-6 text-center text-[13px] text-muted-foreground">
                No results found.
              </Command.Empty>

              {/* AI Quick Access */}
              <Command.Group
                heading="ai"
                className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground/70"
              >
                <Command.Item
                  onSelect={switchToAI}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground aria-selected:bg-muted aria-selected:text-foreground"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Ask AI...</span>
                  <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    ⌘J
                  </kbd>
                </Command.Item>
              </Command.Group>

              {/* Navigation */}
              <Command.Group
                heading="navigation"
                className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground/70"
              >
                <Command.Item
                  onSelect={() => runCommand(() => router.push('/'))}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground aria-selected:bg-muted aria-selected:text-foreground"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span>Dashboard</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => runCommand(() => router.push('/inbox'))}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground aria-selected:bg-muted aria-selected:text-foreground"
                >
                  <Inbox className="h-4 w-4" />
                  <span>Inbox</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => runCommand(() => router.push('/projects'))}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground aria-selected:bg-muted aria-selected:text-foreground"
                >
                  <Folder className="h-4 w-4" />
                  <span>Projects</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => runCommand(() => router.push('/clients'))}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground aria-selected:bg-muted aria-selected:text-foreground"
                >
                  <Building2 className="h-4 w-4" />
                  <span>Clients</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => runCommand(() => router.push('/schedule'))}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground aria-selected:bg-muted aria-selected:text-foreground"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Schedule</span>
                </Command.Item>
              </Command.Group>

              {/* Quick Actions */}
              <Command.Group
                heading="quick actions"
                className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground/70"
              >
                <Command.Item
                  onSelect={() =>
                    runCommand(() => {
                      setShowNewTaskModal(true);
                    })
                  }
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground aria-selected:bg-muted aria-selected:text-foreground"
                >
                  <CheckSquare className="h-4 w-4 text-amber-500" />
                  <span>New Task</span>
                  <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    c
                  </kbd>
                </Command.Item>
                <Command.Item
                  onSelect={() =>
                    runCommand(() => {
                      setShowNewMeetingModal(true);
                    })
                  }
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground aria-selected:bg-muted aria-selected:text-foreground"
                >
                  <CalendarPlus className="h-4 w-4 text-violet-500" />
                  <span>New Meeting</span>
                  <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    m
                  </kbd>
                </Command.Item>
              </Command.Group>

              {/* Actions */}
              <Command.Group
                heading="actions"
                className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground/70"
              >
                <Command.Item
                  onSelect={() => runCommand(() => router.push('/projects?new=true'))}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground aria-selected:bg-muted aria-selected:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Project</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => runCommand(() => router.push('/settings'))}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground aria-selected:bg-muted aria-selected:text-foreground"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        )}

        {/* AI mode */}
        {mode === 'ai' && (
          <div className="flex flex-col">
            {/* Messages */}
            <div className="max-h-[300px] overflow-y-auto p-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Sparkles className="mb-2 h-6 w-6 text-primary/50" />
                  <p className="text-[13px] text-muted-foreground">
                    Ask me anything about your projects, tasks, or schedule.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {['What are my overdue tasks?', 'Show my projects', 'Create a task'].map(
                      (suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setInputValue(suggestion)}
                          className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                        >
                          {suggestion}
                        </button>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={cn(
                        'flex gap-2',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[75%] rounded-lg px-2.5 py-1.5 text-[13px]',
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        )}
                      >
                        <p className="whitespace-pre-wrap leading-snug">
                          {getMessageContent(message)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleAISubmit} className="border-t border-border p-2">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask AI..."
                  disabled={isLoading}
                  className="flex-1 bg-transparent px-2 py-1.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowUp className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Quick Action Modals */}
      <NewTaskModalControlled open={showNewTaskModal} onOpenChange={setShowNewTaskModal} />
      <NewMeetingModalControlled open={showNewMeetingModal} onOpenChange={setShowNewMeetingModal} />
    </div>
  );
}
