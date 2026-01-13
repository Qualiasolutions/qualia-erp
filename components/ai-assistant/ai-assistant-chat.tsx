'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Bot, User, Sparkles, Loader2, Copy, Check, Printer, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIAssistant } from './ai-assistant-provider';

// Quick actions for empty state
const quickActions = ['Show my tasks', 'Create a task', 'Project status', 'Schedule a meeting'];

// Document drafting prompts
const documentPrompts = [
  'Draft an AI agent agreement',
  'Create an NDA',
  'Web development proposal',
  'Marketing services agreement',
];

// Convert markdown to safe HTML for printing
function markdownToHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^---$/gm, '<hr style="page-break-after: always; border: none;">')
    .replace(/\n/g, '<br>');
}

export function AIAssistantChat() {
  const { messages, isStreaming, mode, sendMessage, clearConversation } = useAIAssistant();

  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const text = input.trim();
    setInput('');
    await sendMessage(text);
  };

  const handleQuickAction = (action: string) => {
    sendMessage(action);
  };

  const copyLastMessage = useCallback(() => {
    const lastAssistant = messages.filter((m) => m.role === 'assistant').pop();
    if (lastAssistant) {
      navigator.clipboard.writeText(lastAssistant.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [messages]);

  const printDocument = useCallback(() => {
    const lastAssistant = messages.filter((m) => m.role === 'assistant').pop();
    if (!lastAssistant) return;

    // Convert markdown to HTML with escaping for safety
    const content = markdownToHtml(lastAssistant.content);

    // Create print document as data URL
    const htmlDoc = `<!DOCTYPE html>
<html>
<head>
  <title>Qualia Solutions - Document</title>
  <style>
    body {
      font-family: Georgia, 'Times New Roman', serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    h1, h2, h3 {
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
    }
    h2 {
      border-bottom: 2px solid #000;
      padding-bottom: 5px;
      margin-top: 30px;
    }
    strong { font-weight: bold; }
    @media print {
      body { margin: 0; padding: 20px; }
    }
  </style>
</head>
<body>${content}</body>
</html>`;

    // Open as data URL for printing
    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlDoc);
    const printWindow = window.open(dataUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }, [messages]);

  const prompts = mode === 'document' ? documentPrompts : quickActions;
  const hasMessages = messages.length > 0;
  const hasAssistantMessage = messages.some((m) => m.role === 'assistant');

  return (
    <div className="flex h-full flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {!hasMessages ? (
          <div className="flex h-full flex-col items-center justify-center px-4 py-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/10">
              <Sparkles className="h-6 w-6 text-primary/70" />
            </div>
            <h3 className="mb-1 text-sm font-medium text-foreground">
              {mode === 'document' ? 'Document Drafting' : 'How can I help?'}
            </h3>
            <p className="mb-4 text-center text-xs text-muted-foreground">
              {mode === 'document'
                ? 'Describe the document you need'
                : 'Ask about tasks, projects, or teams'}
            </p>

            <div className="w-full space-y-1.5">
              {prompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(prompt)}
                  className={cn(
                    'w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-left text-xs transition-all',
                    'hover:border-border hover:bg-muted/50'
                  )}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn('flex gap-2', message.role === 'user' ? 'flex-row-reverse' : '')}
              >
                <div
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                    message.role === 'user' ? 'bg-primary' : 'bg-secondary'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="h-3 w-3 text-primary-foreground" />
                  ) : (
                    <Bot className="h-3 w-3 text-primary" />
                  )}
                </div>
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-2.5 py-1.5 text-xs',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground'
                  )}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}

            {isStreaming && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
                <div className="rounded-lg bg-secondary px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Actions Bar */}
      {hasAssistantMessage && (
        <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-3 py-1.5">
          <button
            onClick={clearConversation}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
          <div className="flex items-center gap-2">
            {mode === 'document' && (
              <button
                onClick={printDocument}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
              >
                <Printer className="h-3 w-3" />
                Print
              </button>
            )}
            <button
              onClick={copyLastMessage}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="border-t border-border bg-background p-2">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'document' ? 'Describe the document...' : 'Ask anything...'}
            disabled={isStreaming}
            className={cn(
              'h-8 flex-1 rounded-md border border-border bg-background px-2.5 text-xs',
              'placeholder:text-muted-foreground/60',
              'focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20',
              'disabled:opacity-50'
            )}
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50',
              'transition-colors'
            )}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
