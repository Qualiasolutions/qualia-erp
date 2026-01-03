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
  Users,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
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
  {
    icon: Phone,
    title: 'Client Communication',
    description: 'Reach out to clients, follow up on leads, schedule meetings',
  },
  {
    icon: FileText,
    title: 'Paperwork & Documentation',
    description: 'Contracts, proposals, project briefs, and documentation',
  },
  {
    icon: Receipt,
    title: 'Invoices & Finances',
    description: 'Send invoices, track payments, manage expenses',
  },
  {
    icon: Settings,
    title: 'System & Operations',
    description: 'Update CRM, organize files, manage project boards',
  },
];

const eveningTasks = [
  {
    icon: Bot,
    title: 'AI Agent Development',
    description: 'Build voice agents, chatbots, and automation workflows',
  },
  {
    icon: Globe,
    title: 'Website Development',
    description: 'Design and build client websites and web applications',
  },
  {
    icon: Code,
    title: 'Technical Implementation',
    description: 'Coding, integrations, API development, and testing',
  },
  {
    icon: Rocket,
    title: 'Deployment & Launch',
    description: 'Deploy projects, configure hosting, go live with clients',
  },
];

const principles = [
  {
    title: 'Structure Creates Freedom',
    description:
      'By organizing our day into focused blocks, we eliminate decision fatigue and maximize productivity.',
  },
  {
    title: 'Operations First',
    description:
      'Morning admin work ensures smooth business operations and keeps clients happy and informed.',
  },
  {
    title: 'Deep Work in the Evening',
    description:
      'Complex development tasks need uninterrupted focus. Evening sessions are for building.',
  },
  {
    title: 'Quality Over Speed',
    description: 'We deliver excellence. Take the time needed to do things right the first time.',
  },
];

const templates = [
  {
    id: 'web-dev',
    icon: Globe,
    title: 'Web Development Agreement',
    description: 'For website design, development, and web application projects',
    file: '/tempaltes/TEMPLATE_Web_Development_Agreement.pdf',
    color: 'blue',
    prompts: [
      'Create a web development agreement for €3,000',
      'Generate a website project contract with 3 milestones',
    ],
  },
  {
    id: 'ai-agent',
    icon: Bot,
    title: 'AI Agent Agreement',
    description: 'For AI voice agents, chatbots, and automation projects',
    file: '/tempaltes/TEMPLATE_AI_Agent_Agreement.pdf',
    color: 'purple',
    prompts: [
      'Create an AI agent agreement with 50/50 payment',
      'Draft a voice assistant development contract',
    ],
  },
  {
    id: 'marketing',
    icon: Megaphone,
    title: 'Marketing Agreement',
    description: 'For social media management and digital marketing services',
    file: '/tempaltes/TEMPLATE_Marketing_Agreement.pdf',
    color: 'orange',
    prompts: [
      'Create a 3-month marketing retainer at €800/month',
      'Generate a social media management agreement',
    ],
  },
  {
    id: 'nda',
    icon: Shield,
    title: 'NDA Agreement',
    description: 'Non-disclosure agreement for confidential discussions',
    file: '/tempaltes/TEMPLATE_NDA_Agreement.pdf',
    color: 'green',
    prompts: [
      'Create an NDA for a potential AI project',
      'Draft a mutual confidentiality agreement',
    ],
  },
];

const templateColorStyles = {
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-500',
    hover: 'hover:border-blue-500/50 hover:bg-blue-500/5',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-500',
    hover: 'hover:border-purple-500/50 hover:bg-purple-500/5',
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-500',
    hover: 'hover:border-orange-500/50 hover:bg-orange-500/5',
  },
  green: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-500',
    hover: 'hover:border-emerald-500/50 hover:bg-emerald-500/5',
  },
};

// Document Generator Chat Component
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

      if (!response.ok) {
        throw new Error('Failed to generate document');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          assistantMessage += chunk;
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
        {
          role: 'assistant',
          content:
            'Sorry, I encountered an error. Please try again or sign in to use the document generator.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
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
    <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
        <div className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Document Generator</h3>
        </div>
        {messages.some((m) => m.role === 'assistant') && (
          <button
            onClick={copyLastMessage}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="h-[300px] overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <FileSignature className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="mb-1 text-sm font-medium text-foreground">Generate Documents</p>
            <p className="mb-4 text-xs text-muted-foreground">
              Ask me to create contracts, agreements, proposals, or any document
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {templates.slice(0, 2).flatMap((t) =>
                t.prompts.slice(0, 1).map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handlePromptClick(prompt)}
                    className="rounded-lg border border-border/40 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground"
                  >
                    {prompt}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[90%] rounded-xl px-3.5 py-2.5 text-sm',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-foreground'
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-xl bg-muted/50 px-3.5 py-2.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/40" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/40 [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/40 [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border/40 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the document you need..."
            disabled={isLoading}
            className="h-10 flex-1 rounded-lg border border-border/50 bg-muted/30 px-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground/50 focus:border-border focus:bg-background focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function TeamWorkflowPage() {
  const [activeSection, setActiveSection] = useState<'morning' | 'evening'>('morning');

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border/50 bg-gradient-to-br from-primary/5 via-background to-background px-6 py-16 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.05)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        <div className="relative mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            Welcome to the Team
          </div>

          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            How We Work at{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Qualia
            </span>
          </h1>

          <p className="text-lg text-muted-foreground">
            A structured approach to maximize productivity and deliver exceptional results for our
            clients.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Daily Schedule Overview */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-semibold text-foreground">
            Daily Schedule Overview
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Morning Block */}
            <button
              onClick={() => setActiveSection('morning')}
              className={cn(
                'group relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-300',
                activeSection === 'morning'
                  ? 'border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-orange-500/5 shadow-lg shadow-amber-500/10'
                  : 'border-border/50 bg-card/50 hover:border-amber-500/30 hover:bg-amber-500/5'
              )}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'rounded-xl p-3 transition-colors',
                      activeSection === 'morning' ? 'bg-amber-500/20' : 'bg-muted'
                    )}
                  >
                    <Sun
                      className={cn(
                        'h-6 w-6',
                        activeSection === 'morning' ? 'text-amber-500' : 'text-muted-foreground'
                      )}
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Morning Session</h3>
                    <p className="text-sm text-muted-foreground">Operations & Admin</p>
                  </div>
                </div>
                <div
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
                    activeSection === 'morning'
                      ? 'bg-amber-500/20 text-amber-500'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Clock className="h-3.5 w-3.5" />
                  2-3 hours
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Coffee className="h-4 w-4" />
                <span>Start fresh, handle business essentials</span>
              </div>
            </button>

            {/* Evening Block */}
            <button
              onClick={() => setActiveSection('evening')}
              className={cn(
                'group relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-300',
                activeSection === 'evening'
                  ? 'border-indigo-500/50 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 shadow-lg shadow-indigo-500/10'
                  : 'border-border/50 bg-card/50 hover:border-indigo-500/30 hover:bg-indigo-500/5'
              )}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'rounded-xl p-3 transition-colors',
                      activeSection === 'evening' ? 'bg-indigo-500/20' : 'bg-muted'
                    )}
                  >
                    <Moon
                      className={cn(
                        'h-6 w-6',
                        activeSection === 'evening' ? 'text-indigo-500' : 'text-muted-foreground'
                      )}
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Evening Session</h3>
                    <p className="text-sm text-muted-foreground">Development & Building</p>
                  </div>
                </div>
                <div
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
                    activeSection === 'evening'
                      ? 'bg-indigo-500/20 text-indigo-500'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Clock className="h-3.5 w-3.5" />
                  4-5 hours
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Rocket className="h-4 w-4" />
                <span>Deep focus, build amazing things</span>
              </div>
            </button>
          </div>
        </div>

        {/* Task Details */}
        <div className="mb-16">
          <div
            className={cn(
              'rounded-2xl border p-8 transition-all duration-500',
              activeSection === 'morning'
                ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent'
                : 'border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-transparent'
            )}
          >
            <div className="mb-6 flex items-center gap-3">
              {activeSection === 'morning' ? (
                <Sun className="h-8 w-8 text-amber-500" />
              ) : (
                <Moon className="h-8 w-8 text-indigo-500" />
              )}
              <div>
                <h3 className="text-2xl font-semibold text-foreground">
                  {activeSection === 'morning' ? 'Morning Tasks' : 'Evening Tasks'}
                </h3>
                <p className="text-muted-foreground">
                  {activeSection === 'morning'
                    ? 'Handle operations to keep the business running smoothly'
                    : 'Focus on building and creating value for clients'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {(activeSection === 'morning' ? morningTasks : eveningTasks).map((task, index) => (
                <div
                  key={task.title}
                  className="group flex gap-4 rounded-xl border border-border/50 bg-card/50 p-4 transition-all duration-300 hover:border-border hover:bg-card"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div
                    className={cn(
                      'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-colors',
                      activeSection === 'morning'
                        ? 'bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20'
                        : 'bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500/20'
                    )}
                  >
                    <task.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{task.title}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Visual Timeline */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-semibold text-foreground">
            A Day at Qualia
          </h2>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-amber-500 via-muted to-indigo-500" />

            <div className="space-y-8">
              {/* Morning Start */}
              <div className="relative flex items-center justify-center">
                <div className="z-10 flex items-center gap-3 rounded-full border border-amber-500/50 bg-amber-500/10 px-6 py-2">
                  <Sun className="h-5 w-5 text-amber-500" />
                  <span className="font-medium text-amber-500">Morning Start</span>
                </div>
              </div>

              {/* Morning Tasks */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex justify-end md:pr-8">
                  <div className="max-w-sm rounded-xl border border-border/50 bg-card p-4">
                    <div className="flex items-center gap-2 text-amber-500">
                      <Phone className="h-4 w-4" />
                      <span className="font-medium">Calls & Emails</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Contact clients and follow up on opportunities
                    </p>
                  </div>
                </div>
                <div className="md:pl-8">
                  <div className="max-w-sm rounded-xl border border-border/50 bg-card p-4">
                    <div className="flex items-center gap-2 text-amber-500">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">Admin Work</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Invoices, contracts, and system updates
                    </p>
                  </div>
                </div>
              </div>

              {/* Break */}
              <div className="relative flex items-center justify-center">
                <div className="z-10 flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm">
                  <Coffee className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Break & Recharge</span>
                </div>
              </div>

              {/* Evening Start */}
              <div className="relative flex items-center justify-center">
                <div className="z-10 flex items-center gap-3 rounded-full border border-indigo-500/50 bg-indigo-500/10 px-6 py-2">
                  <Moon className="h-5 w-5 text-indigo-500" />
                  <span className="font-medium text-indigo-500">Evening Session</span>
                </div>
              </div>

              {/* Evening Tasks */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex justify-end md:pr-8">
                  <div className="max-w-sm rounded-xl border border-border/50 bg-card p-4">
                    <div className="flex items-center gap-2 text-indigo-500">
                      <Bot className="h-4 w-4" />
                      <span className="font-medium">AI Development</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Build voice agents and automation systems
                    </p>
                  </div>
                </div>
                <div className="md:pl-8">
                  <div className="max-w-sm rounded-xl border border-border/50 bg-card p-4">
                    <div className="flex items-center gap-2 text-indigo-500">
                      <Globe className="h-4 w-4" />
                      <span className="font-medium">Web Development</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Design and build client websites
                    </p>
                  </div>
                </div>
              </div>

              {/* End */}
              <div className="relative flex items-center justify-center">
                <div className="z-10 flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-4 py-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium text-emerald-500">Day Complete</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Principles */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-semibold text-foreground">
            Our Principles
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {principles.map((principle, index) => (
              <div
                key={principle.title}
                className="rounded-xl border border-border/50 bg-card/50 p-6 transition-all duration-300 hover:border-border hover:bg-card"
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </div>
                  <h3 className="font-semibold text-foreground">{principle.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{principle.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Document Templates Section */}
        <div className="mb-16">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-semibold text-foreground">Document Templates</h2>
            <p className="text-muted-foreground">
              Professional agreements and contracts for client projects
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Templates Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {templates.map((template) => {
                const colors =
                  templateColorStyles[template.color as keyof typeof templateColorStyles];
                return (
                  <div
                    key={template.id}
                    className={cn(
                      'group rounded-xl border p-4 transition-all duration-300',
                      colors.border,
                      colors.hover
                    )}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className={cn('rounded-lg p-2', colors.bg)}>
                        <template.icon className={cn('h-5 w-5', colors.text)} />
                      </div>
                      <a
                        href={template.file}
                        download
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </a>
                    </div>
                    <h3 className="mb-1 font-medium text-foreground">{template.title}</h3>
                    <p className="mb-3 text-xs text-muted-foreground">{template.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {template.prompts.map((prompt, i) => (
                        <span
                          key={i}
                          className="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {prompt.slice(0, 25)}...
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Document Generator */}
            <DocumentGenerator />
          </div>
        </div>

        {/* Brand Guidelines */}
        <div className="mb-16">
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="mb-1 font-semibold text-foreground">Brand Guidelines</h3>
                <p className="text-sm text-muted-foreground">
                  Official Qualia Solutions brand colors, logos, and design standards
                </p>
              </div>
              <a
                href="/tempaltes/Qualia_Solutions_Brand_Guidelines.pdf"
                download
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </a>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="inline-flex flex-col items-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-8">
            <Users className="mb-4 h-12 w-12 text-primary" />
            <h3 className="mb-2 text-xl font-semibold text-foreground">Ready to Get Started?</h3>
            <p className="mb-6 max-w-md text-muted-foreground">
              Work together to build amazing things for our clients. Structure and consistency lead
              to success.
            </p>
            <div className="flex items-center gap-2 text-primary">
              <span className="font-medium">Let&apos;s do this</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
