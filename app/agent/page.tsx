'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, PanelLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConversationSidebar } from '@/components/ai-assistant/conversation-sidebar';
import {
  useConversations,
  useConversationMessages,
  invalidateConversations,
  invalidateConversationMessages,
} from '@/lib/swr';
import type { Message } from '@/app/actions/ai-conversations';

// Quick action prompts for empty state
const quickActions = ['Show my tasks', 'Project status', 'Create an invoice', 'Schedule a meeting'];

// Thinking indicator with animated dots
function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="rounded-xl bg-secondary px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span
              className="h-2 w-2 animate-bounce rounded-full bg-primary"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="h-2 w-2 animate-bounce rounded-full bg-primary"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="h-2 w-2 animate-bounce rounded-full bg-primary"
              style={{ animationDelay: '300ms' }}
            />
          </div>
          <span className="text-sm text-muted-foreground">Thinking...</span>
        </div>
      </div>
    </div>
  );
}

export default function AgentPage() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div
        className={cn(
          'w-72 border-r border-border transition-transform duration-300',
          'md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
        )}
      >
        <ConversationSidebar
          activeConversationId={activeConversationId}
          onSelectConversation={(id) => setActiveConversationId(id)}
          onNewConversation={handleNewConversation}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col bg-background">
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted md:hidden"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </button>
            <h1 className="text-sm font-medium">
              {activeConversation?.title || 'New Conversation'}
            </h1>
          </div>
          {activeConversationId && (
            <button
              onClick={handleNewConversation}
              className="text-sm text-muted-foreground hover:text-foreground"
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
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/10">
                <Sparkles className="h-8 w-8 text-primary/70" />
              </div>
              <h2 className="mb-2 text-xl font-semibold">Qualia AI Agent</h2>
              <p className="mb-8 text-center text-sm text-muted-foreground">
                Ask about tasks, projects, invoices, or anything else
              </p>

              <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                {quickActions.map((action) => (
                  <button
                    key={action}
                    onClick={() => handleQuickAction(action)}
                    className={cn(
                      'rounded-xl border border-border bg-card px-4 py-3 text-left text-sm transition-all',
                      'hover:border-primary/50 hover:bg-muted/50'
                    )}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Messages
            <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
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
                      message.role === 'user' ? 'bg-primary' : 'bg-secondary'
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
                      'max-w-[85%] rounded-xl px-4 py-2.5 text-sm',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground'
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
        <div className="border-t border-border bg-background p-4">
          <form onSubmit={handleSendMessage} className="mx-auto max-w-3xl">
            <div className="flex items-center gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isStreaming}
                className={cn(
                  'h-11 flex-1 rounded-xl border border-border bg-muted/30 px-4 text-sm',
                  'placeholder:text-muted-foreground/60',
                  'focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20',
                  'disabled:opacity-50'
                )}
              />
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl',
                  'bg-primary text-primary-foreground',
                  'hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50',
                  'transition-colors'
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
