'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { ConversationSidebar } from '@/components/ai-assistant/conversation-sidebar';
import {
  useConversations,
  useConversationMessages,
  invalidateConversations,
  invalidateConversationMessages,
} from '@/lib/swr';
import type { Message } from '@/app/actions/ai-conversations';

// Quick action prompts for empty state
const allQuickActions = [
  { label: 'Show my tasks', roles: ['admin', 'employee'] },
  { label: 'Project status', roles: ['admin', 'employee'] },
  { label: 'Create an invoice', roles: ['admin'] },
  { label: 'Schedule a meeting', roles: ['admin', 'employee'] },
  { label: 'Client billing overview', roles: ['admin'] },
  { label: 'Team activity summary', roles: ['admin'] },
];

function getQuickActions(userRole: string): string[] {
  return allQuickActions
    .filter((action) => action.roles.includes(userRole))
    .map((action) => action.label);
}

// Thinking indicator with animated dots — respects prefers-reduced-motion
function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 motion-reduce:animate-none">
            <span
              className="shimmer h-2 w-2 rounded-full bg-primary motion-reduce:animate-none"
              style={{ animationDelay: '0ms', animationDuration: '1.2s' }}
            />
            <span
              className="shimmer h-2 w-2 rounded-full bg-primary motion-reduce:animate-none"
              style={{ animationDelay: '200ms', animationDuration: '1.2s' }}
            />
            <span
              className="shimmer h-2 w-2 rounded-full bg-primary motion-reduce:animate-none"
              style={{ animationDelay: '400ms', animationDuration: '1.2s' }}
            />
          </div>
          <span className="text-sm text-muted-foreground">Thinking...</span>
        </div>
      </div>
    </div>
  );
}

interface AgentClientProps {
  userRole?: string;
}

export function AgentClient({ userRole = 'employee' }: AgentClientProps) {
  const quickActions = getQuickActions(userRole);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { conversations } = useConversations();
  const { messages: dbMessages } = useConversationMessages(activeConversationId);

  // Sync local messages with database messages when conversation changes
  useEffect(() => {
    setLocalMessages(dbMessages);
  }, [dbMessages, activeConversationId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, isStreaming]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput('');
    setIsStreaming(true);

    // Optimistically add user message
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConversationId || '',
      role: 'user',
      content: userMessage,
      tool_calls: null,
      tool_results: null,
      created_at: new Date().toISOString(),
    };

    setLocalMessages((prev) => [...prev, tempUserMessage]);

    try {
      // Send to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...localMessages, tempUserMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          conversationId: activeConversationId,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      // Get conversation ID from response header
      const newConversationId = response.headers.get('X-Conversation-Id');
      if (newConversationId && newConversationId !== activeConversationId) {
        setActiveConversationId(newConversationId);
        invalidateConversations(true);
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;

          // Update local messages with streaming content
          setLocalMessages((prev) => {
            const withoutLastAssistant = prev.filter(
              (m) => !(m.role === 'assistant' && m.id.startsWith('temp-assistant'))
            );
            return [
              ...withoutLastAssistant,
              {
                id: 'temp-assistant',
                conversation_id: newConversationId || activeConversationId || '',
                role: 'assistant' as const,
                content: assistantContent,
                tool_calls: null,
                tool_results: null,
                created_at: new Date().toISOString(),
              },
            ];
          });
        }
      }

      // Invalidate caches to refresh from database
      if (newConversationId || activeConversationId) {
        invalidateConversationMessages(newConversationId || activeConversationId!, true);
        invalidateConversations(true);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic user message on error
      setLocalMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    inputRef.current?.focus();
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setLocalMessages([]);
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const hasMessages = localMessages.length > 0;

  return (
    <div className="flex h-full">
      {/* Desktop Sidebar */}
      <div className="hidden w-72 border-r border-border bg-card md:flex md:flex-col">
        <ConversationSidebar
          activeConversationId={activeConversationId}
          onSelectConversation={(id) => setActiveConversationId(id)}
          onNewConversation={handleNewConversation}
          onClose={() => setMobileSidebarOpen(false)}
        />
      </div>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Conversations</SheetTitle>
          <ConversationSidebar
            activeConversationId={activeConversationId}
            onSelectConversation={(id) => {
              setActiveConversationId(id);
              setMobileSidebarOpen(false);
            }}
            onNewConversation={() => {
              handleNewConversation();
              setMobileSidebarOpen(false);
            }}
            onClose={() => setMobileSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col bg-background">
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileSidebarOpen(true)}
              className="min-h-[44px] min-w-[44px] md:hidden"
              aria-label="Open conversations"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-sm font-medium">
              {activeConversation?.title || 'New Conversation'}
            </h1>
          </div>
          {activeConversationId && (
            <button
              onClick={handleNewConversation}
              className="cursor-pointer text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              New chat
            </button>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {!hasMessages ? (
            // Empty State
            <div className="flex h-full flex-col items-center justify-center px-6 py-16">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl">
                <Sparkles className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <h2 className="mb-2 text-base font-medium text-foreground">Start a conversation</h2>
              <p className="mb-8 text-center text-sm text-muted-foreground">
                Ask about tasks, projects, invoices, or anything else
              </p>

              <div className="flex flex-wrap justify-center gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action}
                    onClick={() => handleQuickAction(action)}
                    className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm transition-colors duration-150 hover:bg-muted/30"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Messages
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              {localMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex items-start gap-3',
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      message.role === 'user' ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 text-primary-foreground" />
                    ) : (
                      <Bot className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'max-w-[80%] px-4 py-2.5 text-sm',
                      message.role === 'user'
                        ? 'ml-auto rounded-2xl rounded-br-sm bg-primary text-primary-foreground'
                        : 'rounded-2xl rounded-bl-sm bg-muted text-foreground'
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}

              {/* Thinking indicator */}
              {isStreaming && localMessages[localMessages.length - 1]?.role === 'user' && (
                <ThinkingIndicator />
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-card/80 p-4 backdrop-blur-xl">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isStreaming}
              className={cn(
                'h-11 flex-1 rounded-xl border border-border bg-muted/30 px-4 text-sm transition-all duration-200 ease-premium',
                'placeholder:text-muted-foreground/60',
                'focus:border-primary/50 focus:outline-none focus:ring-[3px] focus:ring-primary/15',
                'disabled:opacity-50'
              )}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                'bg-primary text-primary-foreground',
                'hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50',
                'cursor-pointer transition-all duration-150 ease-premium active:scale-[0.97]'
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
