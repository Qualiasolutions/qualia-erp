'use client';

import * as React from 'react';
import { useState } from 'react';
import {
  Sun,
  Moon,
  Phone,
  FileText,
  Receipt,
  Settings,
  Code,
  Bot,
  Globe,
  Clock,
  Coffee,
  Rocket,
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

const morningTasks = [
  { icon: Phone, title: 'Client Communication', description: 'Calls, emails, follow-ups' },
  { icon: FileText, title: 'Documentation', description: 'Contracts, proposals, briefs' },
  { icon: Receipt, title: 'Invoices', description: 'Billing and payments' },
  { icon: Settings, title: 'Operations', description: 'CRM, files, project boards' },
];

const eveningTasks = [
  { icon: Bot, title: 'AI Development', description: 'Voice agents, chatbots, automation' },
  { icon: Globe, title: 'Web Development', description: 'Websites and web apps' },
  { icon: Code, title: 'Implementation', description: 'Coding, APIs, integrations' },
  { icon: Rocket, title: 'Deployment', description: 'Launch and go-live' },
];

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

export default function TeamWorkflowPage() {
  const [activeTab, setActiveTab] = useState<'morning' | 'evening'>('morning');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-semibold text-foreground">Team Workflow</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How we organize our work at Qualia Solutions
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Daily Schedule */}
        <section className="mb-12">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Daily Schedule
          </h2>

          {/* Tab Buttons */}
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setActiveTab('morning')}
              className={cn(
                'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                activeTab === 'morning'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Sun className="h-4 w-4" />
              Morning (2-3h)
            </button>
            <button
              onClick={() => setActiveTab('evening')}
              className={cn(
                'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                activeTab === 'evening'
                  ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Moon className="h-4 w-4" />
              Evening (4-5h)
            </button>
          </div>

          {/* Task Grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {(activeTab === 'morning' ? morningTasks : eveningTasks).map((task) => (
              <div
                key={task.title}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
              >
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-md',
                    activeTab === 'morning' ? 'bg-amber-500/10' : 'bg-indigo-500/10'
                  )}
                >
                  <task.icon
                    className={cn(
                      'h-4 w-4',
                      activeTab === 'morning'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-indigo-600 dark:text-indigo-400'
                    )}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground">{task.title}</h3>
                  <p className="text-xs text-muted-foreground">{task.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{activeTab === 'morning' ? '2-3 hours' : '4-5 hours'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Coffee className="h-3 w-3" />
              <span>
                {activeTab === 'morning' ? 'Operations & Admin' : 'Development & Building'}
              </span>
            </div>
          </div>
        </section>

        {/* Templates */}
        <section className="mb-12">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Document Templates
          </h2>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Template List */}
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

            {/* Document Generator */}
            <DocumentGenerator />
          </div>
        </section>

        {/* Quick Reference */}
        <section>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Key Principles
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-medium text-foreground">Structure Creates Freedom</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Organized blocks eliminate decision fatigue
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-medium text-foreground">Operations First</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Morning admin keeps business running
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-medium text-foreground">Deep Work Evening</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Complex tasks need uninterrupted focus
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-medium text-foreground">Quality Over Speed</h3>
              <p className="mt-1 text-xs text-muted-foreground">Take time to do things right</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
