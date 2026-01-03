'use client';

import * as React from 'react';
import { useState } from 'react';
import {
  FileText,
  Bot,
  Globe,
  FileSignature,
  Shield,
  Megaphone,
  Download,
  Send,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DailyScheduleHub } from '@/components/team/daily-schedule-hub';

// Document templates configuration
const templates = [
  {
    id: 'web-dev',
    icon: Globe,
    title: 'Web Development',
    description: 'Website and app projects',
    file: '/tempaltes/TEMPLATE_Web_Development_Agreement.pdf',
  },
  {
    id: 'ai-agent',
    icon: Bot,
    title: 'AI Agent',
    description: 'Voice agents and chatbots',
    file: '/tempaltes/TEMPLATE_AI_Agent_Agreement.pdf',
  },
  {
    id: 'marketing',
    icon: Megaphone,
    title: 'Marketing',
    description: 'Social media and digital marketing',
    file: '/tempaltes/TEMPLATE_Marketing_Agreement.pdf',
  },
  {
    id: 'nda',
    icon: Shield,
    title: 'NDA',
    description: 'Confidentiality agreement',
    file: '/tempaltes/TEMPLATE_NDA_Agreement.pdf',
  },
];

function DocumentGenerator() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage },
          ],
        }),
      });

      if (!response.ok) throw new Error('Failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantMessage += decoder.decode(value);
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage?.role === 'assistant') {
              lastMessage.content = assistantMessage;
            } else {
              newMessages.push({ role: 'assistant', content: assistantMessage });
            }
            return newMessages;
          });
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Please sign in to use the document generator.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyLastMessage = () => {
    const lastAssistant = messages.filter((m) => m.role === 'assistant').pop();
    if (lastAssistant) {
      navigator.clipboard.writeText(lastAssistant.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Document Generator</span>
        </div>
        {messages.some((m) => m.role === 'assistant') && (
          <button
            onClick={copyLastMessage}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>

      <div className="h-64 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <p className="text-sm text-muted-foreground">
                Ask me to create contracts, proposals, or agreements
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-muted px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the document you need..."
            disabled={isLoading}
            className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function DocumentTemplates() {
  return (
    <div className="space-y-2">
      {templates.map((template) => (
        <div
          key={template.id}
          className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
              <template.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">{template.title}</h3>
              <p className="text-xs text-muted-foreground">{template.description}</p>
            </div>
          </div>
          <a
            href={template.file}
            download
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Download className="h-3 w-3" />
            PDF
          </a>
        </div>
      ))}

      {/* Brand Guidelines */}
      <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">Brand Guidelines</h3>
            <p className="text-xs text-muted-foreground">Colors, logos, standards</p>
          </div>
        </div>
        <a
          href="/tempaltes/Qualia_Solutions_Brand_Guidelines.pdf"
          download
          className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
        >
          <Download className="h-3 w-3" />
          PDF
        </a>
      </div>
    </div>
  );
}

export default function TeamSchedulePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Main Schedule Hub */}
      <DailyScheduleHub />

      {/* Documents Section */}
      <div className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Document Templates
          </h2>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Template List */}
            <DocumentTemplates />

            {/* Document Generator */}
            <DocumentGenerator />
          </div>
        </div>
      </div>
    </div>
  );
}
