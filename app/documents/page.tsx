'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Bot,
  Globe,
  Shield,
  Megaphone,
  Download,
  Send,
  Loader2,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Printer,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Document templates configuration
const templates = [
  {
    id: 'web-dev',
    icon: Globe,
    title: 'Web Development Agreement',
    description: 'For website and web application projects',
    file: '/tempaltes/TEMPLATE_Web_Development_Agreement.pdf',
  },
  {
    id: 'ai-agent',
    icon: Bot,
    title: 'AI Agent Agreement',
    description: 'For voice agents, chatbots, and automation',
    file: '/tempaltes/TEMPLATE_AI_Agent_Agreement.pdf',
  },
  {
    id: 'marketing',
    icon: Megaphone,
    title: 'Marketing Agreement',
    description: 'For social media and digital marketing services',
    file: '/tempaltes/TEMPLATE_Marketing_Agreement.pdf',
  },
  {
    id: 'nda',
    icon: Shield,
    title: 'Non-Disclosure Agreement',
    description: 'Confidentiality and protection of information',
    file: '/tempaltes/TEMPLATE_NDA_Agreement.pdf',
  },
];

// Suggested prompts for quick start
const suggestedPrompts = [
  'Draft an AI agent agreement for a customer service chatbot',
  'Create an NDA for a potential client meeting',
  'Write a web development proposal for an e-commerce site',
  'Generate a marketing services agreement',
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function DocumentDraftingAgent() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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
      // Build conversation with document drafting context
      const systemContext = `You are the Documentation Specialist for Qualia Solutions LTD (Cyprus).

## WHEN USER REQUESTS A DOCUMENT:

**Step 1 - Identify Document Type:**
- AI Agent Agreement (voice agents, chatbots, automation)
- Web Development Agreement (websites, web apps)
- Marketing Agreement (social media, digital marketing)
- NDA (confidentiality agreements)

**Step 2 - Ask Required Information:**
Ask these questions ONE AT A TIME in a conversational way:

1. "What's the client's company name and registration number?"
2. "Who is the contact person and their email?"
3. "Describe the project scope - what are we building/doing?"
4. "What's the timeline? (Start date and duration)"
5. "What's the pricing structure?"
   - Fixed: "Total amount and deposit percentage?"
   - Monthly: "Monthly fee and any setup fee?"
   - Milestone: "What are the milestones and amounts?"
6. "Any special terms or requirements?"

**Step 3 - Generate Document:**
Once you have all information, generate a COMPLETE professional agreement with:
- All sections filled (no [BRACKETS] placeholders)
- Cyprus jurisdiction and governing law
- All amounts stated as "+ VAT"
- Qualia Solutions branding throughout

**Step 4 - Format for Print:**
Format the final document with clear section headers for easy printing:
- Use "---" for page breaks between major sections
- Bold section headers
- Numbered clauses
- Professional formatting

COMPANY INFO:
- Legal Name: Qualio Solutions LTD
- Registration: 1109346
- Address: Nicosia, Lefkosia 1011, Cyprus
- Founder: Fawzi Goussous
- Email: info@qualiasolutions.net
- Phone: +357 99111668

Available templates: AI Agent, Web Development, Marketing, NDA`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemContext },
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

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const copyLastMessage = () => {
    const lastAssistant = messages.filter((m) => m.role === 'assistant').pop();
    if (lastAssistant) {
      navigator.clipboard.writeText(lastAssistant.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const printDocument = () => {
    const lastAssistant = messages.filter((m) => m.role === 'assistant').pop();
    if (lastAssistant) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        // Convert markdown-style formatting to HTML
        const content = lastAssistant.content
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/^### (.*$)/gm, '<h3>$1</h3>')
          .replace(/^## (.*$)/gm, '<h2>$1</h2>')
          .replace(/^# (.*$)/gm, '<h1>$1</h1>')
          .replace(/^---$/gm, '<hr style="page-break-after: always; border: none;">')
          .replace(/\n/g, '<br>');

        printWindow.document.write(`
          <!DOCTYPE html>
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
              strong {
                font-weight: bold;
              }
              @media print {
                body {
                  margin: 0;
                  padding: 20px;
                }
              }
            </style>
          </head>
          <body>${content}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setInput('');
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-12">
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/10">
              <Sparkles className="h-8 w-8 text-primary/70" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-foreground">Document Drafting Agent</h2>
            <p className="mb-8 max-w-md text-center text-sm text-muted-foreground">
              Describe the document you need and I&apos;ll help you draft it. I&apos;ll ask
              questions to ensure the document meets your requirements.
            </p>

            {/* Suggested Prompts */}
            <div className="w-full max-w-2xl space-y-2">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground/60">
                Try one of these
              </p>
              {suggestedPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedPrompt(prompt)}
                  className={cn(
                    'group flex w-full items-center justify-between rounded-lg border border-border/50 bg-card/50 px-4 py-3 text-left text-sm transition-all',
                    'hover:border-border hover:bg-muted/50'
                  )}
                >
                  <span className="text-foreground/80">{prompt}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-1 group-hover:text-foreground/60" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 p-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-xl px-4 py-3 text-sm',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-foreground ring-1 ring-border/50'
                  )}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-4 py-3 ring-1 ring-border/50">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Drafting...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Actions Bar */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-4 py-2">
          <button
            onClick={clearConversation}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear conversation
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={printDocument}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Printer className="h-3 w-3" />
              Print / Download PDF
            </button>
            <button
              onClick={copyLastMessage}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border bg-background p-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the document you need..."
            disabled={isLoading}
            className={cn(
              'h-11 flex-1 rounded-lg border border-border bg-background px-4 text-sm',
              'placeholder:text-muted-foreground/60',
              'focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20',
              'disabled:opacity-50'
            )}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-lg',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50',
              'transition-colors'
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function TemplateCard({ template }: { template: (typeof templates)[0] }) {
  const Icon = template.icon;

  return (
    <div className="group flex items-center justify-between rounded-lg border border-border/60 bg-card/50 p-4 transition-all hover:border-border hover:bg-card">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 ring-1 ring-border/50">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-foreground">{template.title}</h3>
          <p className="text-xs text-muted-foreground">{template.description}</p>
        </div>
      </div>
      <a
        href={template.file}
        download
        className={cn(
          'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium',
          'text-muted-foreground hover:text-foreground',
          'border border-transparent hover:border-border hover:bg-muted',
          'transition-all'
        )}
      >
        <Download className="h-3.5 w-3.5" />
        Download
      </a>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-background lg:flex-row">
      {/* Left Panel - AI Agent */}
      <div className="flex flex-1 flex-col border-b border-border lg:border-b-0 lg:border-r">
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Document Drafting</h1>
              <p className="text-xs text-muted-foreground">AI-powered agreement generation</p>
            </div>
          </div>
        </div>
        <DocumentDraftingAgent />
      </div>

      {/* Right Panel - Templates */}
      <div className="w-full shrink-0 lg:w-96">
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Templates</h2>
              <p className="text-xs text-muted-foreground">Pre-made agreement templates</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="space-y-3">
            {templates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>

          {/* Brand Guidelines - Special Card */}
          <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground">Brand Guidelines</h3>
                  <p className="text-xs text-muted-foreground">Colors, logos, standards</p>
                </div>
              </div>
              <a
                href="/tempaltes/Qualia_Solutions_Brand_Guidelines.pdf"
                download
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Download className="h-3.5 w-3.5" />
                PDF
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
