'use client';

import Image from 'next/image';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  ArrowUp,
  ArrowsClockwise,
  Books,
  CaretRight,
  CheckCircle,
  CircleNotch,
  Compass,
  Copy,
  Lightbulb,
  PaperPlaneTilt,
  Path,
  PuzzlePiece,
  StopCircle,
  Sun,
  Terminal,
  TreeStructure,
  Warning,
  X,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Guide } from '@/lib/guides-data';

interface QualiaKnowledgeViewProps {
  // Kept for compatibility with the page.tsx loader; not rendered directly any
  // more — superseded by the curated Resources panel below.
  guides: Guide[];
}

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const QUALIA_LOGO = '/logo.webp';

function QualiaMark({ size, className }: { size: number; className?: string }) {
  return (
    <Image
      src={QUALIA_LOGO}
      alt=""
      aria-hidden
      width={size}
      height={size}
      priority={false}
      className={cn('object-contain', className)}
      unoptimized
    />
  );
}

const SUGGESTED_QUESTIONS = [
  'What does /qualia-plan do?',
  'How does the Milestone → Phase → Task hierarchy work?',
  'How do I clock out and submit my session report?',
  'When should I use /qualia-debug vs /qualia-quick?',
];

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/* ──────────────────────────────────────────────────────────────────
   Curated resources — hand-picked, beautiful, useful
   ────────────────────────────────────────────────────────────────── */

type ResourceId = 'commands' | 'lifecycle' | 'playbook' | 'concepts';

interface ResourceMeta {
  id: ResourceId;
  title: string;
  subtitle: string;
  icon: PhosphorIcon;
  accent: string;
  ringClass: string;
}

const RESOURCES: ResourceMeta[] = [
  {
    id: 'commands',
    title: 'Command Reference',
    subtitle: 'Every /qualia command, with what it does and when to use it.',
    icon: Terminal,
    accent: 'text-emerald-500',
    ringClass: 'group-hover:ring-emerald-500/30',
  },
  {
    id: 'lifecycle',
    title: 'Project Lifecycle',
    subtitle: 'From the day you start until you hand off the keys.',
    icon: Path,
    accent: 'text-blue-500',
    ringClass: 'group-hover:ring-blue-500/30',
  },
  {
    id: 'playbook',
    title: 'Daily Playbook',
    subtitle: 'Clock-in, focus blocks, and a clean clock-out — every day.',
    icon: Sun,
    accent: 'text-amber-500',
    ringClass: 'group-hover:ring-amber-500/30',
  },
  {
    id: 'concepts',
    title: 'Concepts Cheatsheet',
    subtitle: 'The handful of ideas behind everything Qualia does.',
    icon: PuzzlePiece,
    accent: 'text-violet-500',
    ringClass: 'group-hover:ring-violet-500/30',
  },
];

/* ──────────────────────────────────────────────────────────────────
   Main view
   ────────────────────────────────────────────────────────────────── */

export function QualiaKnowledgeView({}: QualiaKnowledgeViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openResource, setOpenResource] = useState<ResourceId | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      const userMsg: ChatMessage = { id: newId(), role: 'user', content: trimmed };
      const assistantMsg: ChatMessage = { id: newId(), role: 'assistant', content: '' };

      const history = [...messages, userMsg];
      setMessages([...history, assistantMsg]);
      setInput('');
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/api/knowledge/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, content: m.content })),
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error || `Request failed (${res.status})`);
        }
        if (!res.body) throw new Error('No response body');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: acc } : m))
          );
        }
      } catch (e: unknown) {
        if ((e as { name?: string }).name === 'AbortError') {
          // user-initiated stop
        } else {
          const msg = e instanceof Error ? e.message : 'Failed to send message';
          setError(msg);
          setMessages((prev) => prev.filter((m) => m.id !== assistantMsg.id));
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, isStreaming]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  const stopStreaming = () => abortRef.current?.abort();

  const resetChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setInput('');
    inputRef.current?.focus();
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full max-h-[calc(100vh-3rem)] flex-1 flex-col overflow-hidden lg:flex-row">
      {/* Chat — primary column */}
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 lg:p-5">
        <header className="mb-3 flex flex-shrink-0 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <QualiaMark size={20} className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight tracking-tight">Knowledge</h1>
              <p className="text-[11px] text-muted-foreground">
                Ask the assistant or open a resource on the right.
              </p>
            </div>
          </div>
          {hasMessages && (
            <button
              type="button"
              onClick={resetChat}
              aria-label="Start a new chat"
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowsClockwise size={13} weight="bold" />
              New chat
            </button>
          )}
        </header>

        {/* Messages or empty state */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card/40 p-3 lg:p-4"
        >
          {!hasMessages ? (
            <EmptyChatState onPick={(q) => sendMessage(q)} />
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isStreaming={
                    isStreaming && m.role === 'assistant' && m === messages[messages.length - 1]
                  }
                />
              ))}
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <Warning size={16} weight="duotone" className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Composer */}
        <form onSubmit={handleSubmit} className="mt-2 flex-shrink-0">
          <div className="relative rounded-2xl border border-border bg-card shadow-sm transition-colors focus-within:border-primary/50 focus-within:shadow-md">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about Qualia…"
              disabled={isStreaming}
              className="block max-h-32 min-h-[48px] w-full resize-none rounded-2xl bg-transparent px-4 py-3 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
            />
            <div className="absolute bottom-1.5 right-1.5">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={stopStreaming}
                  aria-label="Stop generating"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-foreground text-background transition-transform hover:scale-105"
                >
                  <StopCircle size={18} weight="fill" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Send message"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                >
                  <ArrowUp size={18} weight="bold" />
                </button>
              )}
            </div>
          </div>
        </form>
      </section>

      {/* Resources — curated, simple, beautiful */}
      <aside className="flex min-h-0 w-full flex-col overflow-hidden border-t border-border bg-muted/20 lg:w-[360px] lg:border-l lg:border-t-0 xl:w-[400px]">
        <header className="flex flex-shrink-0 items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
            <Books size={16} weight="duotone" className="text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight tracking-tight text-foreground">
              Resources
            </h2>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Click a card to open the visual reference.
            </p>
          </div>
        </header>
        <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
          {RESOURCES.map((r) => (
            <ResourceCard key={r.id} resource={r} onOpen={() => setOpenResource(r.id)} />
          ))}
        </div>
      </aside>

      {/* Modal */}
      {openResource && <ResourceModal id={openResource} onClose={() => setOpenResource(null)} />}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Empty state
   ────────────────────────────────────────────────────────────────── */

function EmptyChatState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
        <QualiaMark size={32} className="h-8 w-8" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Ask the Qualia Assistant</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Trained on the Qualia framework, the ERP, and the shared Brain. Ask about commands,
        workflows, or how something works.
      </p>
      <div className="mt-5 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTED_QUESTIONS.map((q, i) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            style={{ animationDelay: `${i * 60}ms` }}
            className="qa-fade-in group flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left text-sm text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
          >
            <Lightbulb
              size={14}
              weight="duotone"
              className="flex-shrink-0 text-primary/70 transition-colors group-hover:text-primary"
            />
            <span className="flex-1 leading-tight">{q}</span>
            <CaretRight
              size={12}
              weight="bold"
              className="text-muted-foreground transition-transform group-hover:translate-x-0.5"
            />
          </button>
        ))}
      </div>
      <style>{`
        @keyframes qa-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .qa-fade-in { animation: qa-fade-in 320ms ease-out both; }
      `}</style>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Message bubble + markdown
   ────────────────────────────────────────────────────────────────── */

function MessageBubble({ message, isStreaming }: { message: ChatMessage; isStreaming: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success('Copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  }, [message.content]);

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <QualiaMark size={16} className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm leading-relaxed text-foreground">
            <FormattedMarkdown text={message.content} />
            {isStreaming && message.content.length === 0 && (
              <CircleNotch size={14} weight="bold" className="animate-spin text-muted-foreground" />
            )}
            {isStreaming && message.content.length > 0 && (
              <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-foreground/60" />
            )}
          </div>
          {!isStreaming && message.content && (
            <button
              type="button"
              onClick={handleCopy}
              className="mt-2 inline-flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
            >
              {copied ? (
                <CheckCircle size={12} weight="fill" className="text-emerald-500" />
              ) : (
                <Copy size={12} weight="bold" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FormattedMarkdown({ text }: { text: string }) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === 'code') {
          return (
            <pre
              key={i}
              className="my-2 overflow-x-auto rounded-lg border border-border bg-muted/60 p-3 font-mono text-[12px] text-foreground"
            >
              <code>{b.content}</code>
            </pre>
          );
        }
        if (b.type === 'bullets') {
          return (
            <ul key={i} className="my-2 ml-5 list-disc space-y-1">
              {b.items.map((item, j) => (
                <li key={j}>
                  <FormattedInline text={item} />
                </li>
              ))}
            </ul>
          );
        }
        if (b.type === 'h') {
          const Tag = `h${Math.min(b.level + 2, 6)}` as 'h3' | 'h4' | 'h5' | 'h6';
          return (
            <Tag key={i} className="mt-3 text-sm font-semibold text-foreground">
              {b.content}
            </Tag>
          );
        }
        return (
          <p key={i} className="my-1.5 first:mt-0 last:mb-0">
            <FormattedInline text={b.content} />
          </p>
        );
      })}
    </>
  );
}

type Block =
  | { type: 'p'; content: string }
  | { type: 'code'; content: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'h'; level: number; content: string };

function parseBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ type: 'code', content: buf.join('\n') });
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ type: 'h', level: heading[1].length, content: heading[2] });
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'bullets', items });
      continue;
    }
    if (line.trim() === '') {
      i++;
      continue;
    }
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('```') &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^#{1,4}\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'p', content: para.join(' ') });
  }
  return blocks;
}

function FormattedInline({ text }: { text: string }) {
  const parts = useMemo(() => splitInline(text), [text]);
  return (
    <>
      {parts.map((p, i) =>
        p.type === 'code' ? (
          <code
            key={i}
            className="rounded bg-muted px-1 py-0.5 font-mono text-[12px] text-foreground"
          >
            {p.content}
          </code>
        ) : p.type === 'bold' ? (
          <strong key={i} className="font-semibold text-foreground">
            {p.content}
          </strong>
        ) : (
          <span key={i}>{p.content}</span>
        )
      )}
    </>
  );
}

function splitInline(text: string): Array<{ type: 'text' | 'code' | 'bold'; content: string }> {
  const out: Array<{ type: 'text' | 'code' | 'bold'; content: string }> = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  for (const match of text.matchAll(regex)) {
    const idx = match.index ?? 0;
    if (idx > last) out.push({ type: 'text', content: text.slice(last, idx) });
    const token = match[0];
    if (token.startsWith('`')) out.push({ type: 'code', content: token.slice(1, -1) });
    else out.push({ type: 'bold', content: token.slice(2, -2) });
    last = idx + token.length;
  }
  if (last < text.length) out.push({ type: 'text', content: text.slice(last) });
  return out;
}

/* ──────────────────────────────────────────────────────────────────
   Resource card
   ────────────────────────────────────────────────────────────────── */

function ResourceCard({ resource, onOpen }: { resource: ResourceMeta; onOpen: () => void }) {
  const Icon = resource.icon;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group relative flex w-full cursor-pointer items-start gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 text-left ring-2 ring-transparent transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-lg',
        'focus-visible:outline-none focus-visible:ring-primary/40',
        resource.ringClass
      )}
    >
      <span
        className={cn(
          'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-muted/70 transition-transform duration-200 group-hover:scale-110',
          resource.accent
        )}
      >
        <Icon size={22} weight="duotone" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight text-foreground">{resource.title}</p>
        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
          {resource.subtitle}
        </p>
      </div>
      <CaretRight
        size={14}
        weight="bold"
        className="mt-1 flex-shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
      />
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Modal — beautiful, animated, stylish
   ────────────────────────────────────────────────────────────────── */

function ResourceModal({ id, onClose }: { id: ResourceId; onClose: () => void }) {
  const meta = RESOURCES.find((r) => r.id === id)!;
  const Icon = meta.icon;

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={meta.title}
      onClick={onClose}
      className="qm-overlay fixed inset-0 z-modal flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="qm-panel relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
      >
        {/* Decorative gradient header */}
        <div
          className={cn(
            'absolute inset-x-0 top-0 h-32 bg-gradient-to-b opacity-40',
            id === 'commands' && 'from-emerald-500/30',
            id === 'lifecycle' && 'from-blue-500/30',
            id === 'playbook' && 'from-amber-500/30',
            id === 'concepts' && 'from-violet-500/30'
          )}
          aria-hidden
        />

        <header className="relative flex flex-shrink-0 items-start gap-4 border-b border-border px-6 py-5">
          <span
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-2xl bg-card ring-1 ring-border',
              meta.accent
            )}
          >
            <Icon size={26} weight="duotone" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold leading-tight tracking-tight text-foreground">
              {meta.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{meta.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={18} weight="bold" />
          </button>
        </header>

        <div className="relative flex-1 overflow-y-auto px-6 py-6">
          {id === 'commands' && <CommandsContent />}
          {id === 'lifecycle' && <LifecycleContent />}
          {id === 'playbook' && <PlaybookContent />}
          {id === 'concepts' && <ConceptsContent />}
        </div>
      </div>

      <style>{`
        @keyframes qm-overlay-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes qm-panel-in {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .qm-overlay { animation: qm-overlay-in 200ms ease-out both; }
        .qm-panel   { animation: qm-panel-in 240ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes qm-stagger {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .qm-stagger > * { animation: qm-stagger 380ms ease-out both; }
        .qm-stagger > *:nth-child(1) { animation-delay: 60ms; }
        .qm-stagger > *:nth-child(2) { animation-delay: 100ms; }
        .qm-stagger > *:nth-child(3) { animation-delay: 140ms; }
        .qm-stagger > *:nth-child(4) { animation-delay: 180ms; }
        .qm-stagger > *:nth-child(5) { animation-delay: 220ms; }
        .qm-stagger > *:nth-child(6) { animation-delay: 260ms; }
        .qm-stagger > *:nth-child(7) { animation-delay: 300ms; }
        .qm-stagger > *:nth-child(8) { animation-delay: 340ms; }
      `}</style>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Resource content — Commands
   ────────────────────────────────────────────────────────────────── */

interface CommandEntry {
  cmd: string;
  what: string;
  when: string;
  example?: string;
}

const COMMAND_GROUPS: Array<{ label: string; tint: string; commands: CommandEntry[] }> = [
  {
    label: 'Daily',
    tint: 'text-emerald-500',
    commands: [
      {
        cmd: '/qualia',
        what: 'Smart router. Reads project state and tells you the next command.',
        when: 'Open of day, when you forget where you left off, between phases.',
      },
      {
        cmd: '/qualia-resume',
        what: 'Restore context from .continue-here.md or STATE.md.',
        when: 'After a break or a fresh session.',
      },
      {
        cmd: '/qualia-pause',
        what: 'Save session context for handoff to a future session.',
        when: 'End of day, before /clear, before switching focus.',
      },
      {
        cmd: '/qualia-report',
        what: 'Generate session report and post it to the ERP.',
        when: 'Mandatory before clock-out. No exceptions.',
      },
    ],
  },
  {
    label: 'Project lifecycle',
    tint: 'text-blue-500',
    commands: [
      {
        cmd: '/qualia-new',
        what: 'Kick off a new project — research, JOURNEY.md, full milestone arc.',
        when: 'Brand-new client project. Add --auto to chain build → ship.',
      },
      {
        cmd: '/qualia-plan {N}',
        what: 'Plan phase N — planner agent + plan-checker revision loop.',
        when: 'Before building anything in a phase.',
        example: '/qualia-plan 2',
      },
      {
        cmd: '/qualia-build {N}',
        what: 'Build phase N — wave-based parallel subagents, fresh context per task.',
        when: 'After /qualia-plan returns a clean plan.',
        example: '/qualia-build 2',
      },
      {
        cmd: '/qualia-verify {N}',
        what: 'Goal-backward verification — does it actually work?',
        when: 'Right after /qualia-build for the same phase.',
        example: '/qualia-verify 2',
      },
      {
        cmd: '/qualia-milestone',
        what: 'Close the current milestone, archive artifacts, prep the next one.',
        when: 'After every phase in a milestone is verified.',
      },
      {
        cmd: '/qualia-polish',
        what: 'Design + UX final pass — anti-AI-slop, responsive, accessible.',
        when: 'Phase 1 of the Handoff milestone.',
      },
      {
        cmd: '/qualia-ship',
        what: 'Deploy to prod with quality gates → commit → push → verify.',
        when: 'After polish. Final go-live.',
      },
      {
        cmd: '/qualia-handoff',
        what: 'Final delivery — credentials, docs, client assets, ERP finalization.',
        when: 'After ship verifies green.',
      },
    ],
  },
  {
    label: 'Recovery & investigation',
    tint: 'text-amber-500',
    commands: [
      {
        cmd: '/qualia-debug',
        what: 'Investigative debugging — root cause, minimal fix, DEBUG report.',
        when: 'Something broken, weird behavior, layout issue, slow page.',
      },
      {
        cmd: '/qualia-quick',
        what: 'Skip planning for a small task — bug fix, tweak, hot fix.',
        when: 'One-line change or a clearly scoped tiny task.',
      },
      {
        cmd: '/qualia-idk',
        what: 'Diagnostic. Reads .planning + codebase, explains in plain language.',
        when: '"I don\'t know what\'s going on" / "something feels off".',
      },
      {
        cmd: '/qualia-postmortem',
        what: 'Self-healing — propose framework deltas after a verify fail.',
        when: 'After /qualia-verify FAIL, especially on repeat issues.',
      },
    ],
  },
  {
    label: 'Knowledge & memory',
    tint: 'text-violet-500',
    commands: [
      {
        cmd: '/qualia-recall',
        what: 'Pull lessons from the Brain (Obsidian vault).',
        when: 'Before planning a phase or making a recommendation.',
      },
      {
        cmd: '/qualia-learn',
        what: 'Save a single fact, fix, or client preference to the Brain.',
        when: 'After a non-obvious bug fix or a client conversation.',
      },
      {
        cmd: '/wiki-update',
        what: 'Curated push of project knowledge into the Obsidian vault.',
        when: 'Weekly, or after a significant body of work.',
      },
      {
        cmd: '/qualia-flush',
        what: 'Promote daily-log raw entries to the curated knowledge tier.',
        when: 'Weekly maintenance.',
      },
    ],
  },
];

function CommandsContent() {
  return (
    <div className="qm-stagger space-y-6">
      {COMMAND_GROUPS.map((g) => (
        <section key={g.label}>
          <div className="mb-3 flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full bg-current', g.tint)} aria-hidden />
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
              {g.label}
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {g.commands.map((c) => (
              <CommandTile key={c.cmd} entry={c} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function CommandTile({ entry }: { entry: CommandEntry }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(entry.example ?? entry.cmd);
      setCopied(true);
      toast.success('Copied');
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-muted/20 p-3 transition-colors hover:border-primary/30 hover:bg-muted/40">
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate font-mono text-[13px] font-semibold text-foreground">
          {entry.cmd}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${entry.cmd}`}
          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-card hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
        >
          {copied ? (
            <CheckCircle size={12} weight="fill" className="text-emerald-500" />
          ) : (
            <Copy size={12} weight="bold" />
          )}
        </button>
      </div>
      <p className="mt-1.5 text-[12px] leading-snug text-foreground">{entry.what}</p>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
        <span className="font-semibold text-foreground/70">When:</span> {entry.when}
      </p>
      {entry.example && (
        <code className="mt-2 block overflow-hidden truncate rounded-md bg-foreground/5 px-2 py-1 font-mono text-[11px] text-muted-foreground">
          {entry.example}
        </code>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Resource content — Lifecycle
   ────────────────────────────────────────────────────────────────── */

interface LifecycleStage {
  step: string;
  title: string;
  body: string;
  command: string;
  tip: string;
  icon: PhosphorIcon;
  tint: string;
}

const LIFECYCLE: LifecycleStage[] = [
  {
    step: '01',
    title: 'Kick off the project',
    body: 'Deep questions, parallel research, and a JOURNEY.md that maps every milestone end-to-end on day one.',
    command: '/qualia-new',
    tip: 'Add --auto to chain straight through to building — one approval gate, then it runs.',
    icon: Compass,
    tint: 'text-emerald-500',
  },
  {
    step: '02',
    title: 'Plan the current phase',
    body: 'A planner agent drafts the plan, a plan-checker reviews it, and they iterate until the contract is tight.',
    command: '/qualia-plan {N}',
    tip: 'Read the plan before approving. Catch wrong assumptions here, not three commits later.',
    icon: Path,
    tint: 'text-blue-500',
  },
  {
    step: '03',
    title: 'Build it',
    body: 'Wave-based parallel subagents execute each task in a fresh context. Task 50 gets the same care as Task 1.',
    command: '/qualia-build {N}',
    tip: 'Long phases run in waves automatically. You can step away — it will not skip steps.',
    icon: PuzzlePiece,
    tint: 'text-violet-500',
  },
  {
    step: '04',
    title: 'Verify against the goal',
    body: 'Goal-backward verification. Not "did the tasks run" but "does the feature actually work for the user".',
    command: '/qualia-verify {N}',
    tip: 'On FAIL with gap_cycles < 2, run /qualia-plan {N} --gaps. After two cycles, escalate.',
    icon: CheckCircle,
    tint: 'text-amber-500',
  },
  {
    step: '05',
    title: 'Close the milestone',
    body: 'Archive artifacts, mark requirements complete, regenerate ROADMAP for the next milestone.',
    command: '/qualia-milestone',
    tip: 'This is the human gate between milestones. Take a breath, review, then continue.',
    icon: TreeStructure,
    tint: 'text-rose-500',
  },
  {
    step: '06',
    title: 'Polish for handoff',
    body: 'Design + UX pass. Anti-AI-slop. Responsive, accessible, real craft on the surface the client sees.',
    command: '/qualia-polish',
    tip: 'Phase 1 of the Handoff milestone. Skipping this is how websites end up looking generic.',
    icon: Lightbulb,
    tint: 'text-yellow-500',
  },
  {
    step: '07',
    title: 'Ship to production',
    body: 'Quality gates → commit → push → deploy → verify. No surprise auto-deploys, no skipped checks.',
    command: '/qualia-ship',
    tip: 'Vercel teams: confirm vercel link before /qualia-ship if the project is unfamiliar.',
    icon: PaperPlaneTilt,
    tint: 'text-cyan-500',
  },
  {
    step: '08',
    title: 'Hand off the keys',
    body: 'Production URL + documentation + client assets archive + ERP finalization. Done.',
    command: '/qualia-handoff',
    tip: 'Run /qualia-report on the way out so the ERP closes the project cleanly.',
    icon: CheckCircle,
    tint: 'text-emerald-500',
  },
];

function LifecycleContent() {
  return (
    <ol className="qm-stagger relative space-y-4 pl-3">
      {/* Vertical rail */}
      <div
        className="absolute bottom-3 left-[19px] top-3 w-px bg-gradient-to-b from-primary/40 via-border to-border"
        aria-hidden
      />
      {LIFECYCLE.map((s) => {
        const Icon = s.icon;
        return (
          <li key={s.step} className="relative flex gap-4">
            <span
              className={cn(
                'relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-card ring-2 ring-border',
                s.tint
              )}
            >
              <Icon size={16} weight="duotone" />
            </span>
            <div className="min-w-0 flex-1 rounded-2xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/40">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {s.step}
                </span>
                <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
              </div>
              <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">{s.body}</p>
              <code className="mt-2.5 inline-block rounded-md bg-foreground/5 px-2 py-1 font-mono text-[12px] font-semibold text-foreground">
                {s.command}
              </code>
              <div className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                <Lightbulb
                  size={12}
                  weight="duotone"
                  className="mt-0.5 flex-shrink-0 text-amber-500"
                />
                <span>{s.tip}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Resource content — Daily Playbook
   ────────────────────────────────────────────────────────────────── */

interface PlaybookSegment {
  time: string;
  title: string;
  steps: string[];
  icon: PhosphorIcon;
  tint: string;
  bgTint: string;
}

const PLAYBOOK: PlaybookSegment[] = [
  {
    time: 'Morning',
    title: 'Start the day clean',
    icon: Sun,
    tint: 'text-amber-500',
    bgTint: 'bg-amber-500/10',
    steps: [
      'Clock in from the ERP top-right toggle.',
      'Open /tasks — admin sees the workspace; employees see their inbox.',
      'Run `/qualia` in your project to figure out the next command.',
      'Run `/qualia-resume` if you paused yesterday.',
    ],
  },
  {
    time: 'Working hours',
    title: 'Stay in the loop',
    icon: PuzzlePiece,
    tint: 'text-violet-500',
    bgTint: 'bg-violet-500/10',
    steps: [
      'Move tasks Todo → In Progress → Done as you work.',
      'Use `/qualia-quick` for tweaks, `/qualia-debug` for broken things.',
      'Save lessons with `/qualia-learn` the moment you spot one.',
      'Drop quick questions to the Knowledge assistant on this page.',
    ],
  },
  {
    time: 'End of day',
    title: 'Hand off cleanly',
    icon: PaperPlaneTilt,
    tint: 'text-emerald-500',
    bgTint: 'bg-emerald-500/10',
    steps: [
      'Run `/qualia-pause` so tomorrow-you picks up cold.',
      'Run `/qualia-report` — this is mandatory and posts to the ERP.',
      'Clock out from the same toggle you used at start of day.',
      'Close the laptop. The framework will not page you.',
    ],
  },
];

function PlaybookContent() {
  return (
    <div className="qm-stagger space-y-3">
      {PLAYBOOK.map((seg) => {
        const Icon = seg.icon;
        return (
          <section
            key={seg.time}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <header className={cn('flex items-center gap-3 px-4 py-3', seg.bgTint)}>
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl bg-card ring-1 ring-border',
                  seg.tint
                )}
              >
                <Icon size={18} weight="duotone" />
              </span>
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {seg.time}
                </p>
                <h3 className="text-sm font-semibold leading-tight text-foreground">{seg.title}</h3>
              </div>
            </header>
            <ol className="divide-y divide-border">
              {seg.steps.map((step, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 px-4 py-2.5 text-[13px] text-foreground"
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                      seg.bgTint,
                      seg.tint
                    )}
                  >
                    {i + 1}
                  </span>
                  <PlaybookStep text={step} />
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function PlaybookStep({ text }: { text: string }) {
  // Renders inline `code` styling for backtick-wrapped tokens.
  const parts = useMemo(() => splitInline(text), [text]);
  return (
    <p className="leading-snug">
      {parts.map((p, i) =>
        p.type === 'code' ? (
          <code
            key={i}
            className="rounded bg-muted px-1 py-0.5 font-mono text-[11.5px] text-foreground"
          >
            {p.content}
          </code>
        ) : p.type === 'bold' ? (
          <strong key={i}>{p.content}</strong>
        ) : (
          <span key={i}>{p.content}</span>
        )
      )}
    </p>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Resource content — Concepts cheatsheet
   ────────────────────────────────────────────────────────────────── */

const HIERARCHY: Array<{ name: string; tagline: string; example: string }> = [
  {
    name: 'Project',
    tagline: 'The whole client engagement, top of the tree.',
    example: 'A new website for Aquador.',
  },
  {
    name: 'Journey',
    tagline: 'The full multi-milestone arc, mapped on day one.',
    example: '4 milestones from kickoff to handoff.',
  },
  {
    name: 'Milestone',
    tagline: '2–5 per project. Handoff is always the last one.',
    example: 'Foundations · Build · Polish · Handoff.',
  },
  {
    name: 'Phase',
    tagline: '2–5 tasks. The unit you plan, build, and verify together.',
    example: 'Auth · Schema · Server actions.',
  },
  {
    name: 'Task',
    tagline: 'One commit, one verification contract. Fresh subagent context.',
    example: 'Add /api/v1/reports endpoint.',
  },
];

const GLOSSARY: Array<{ term: string; def: string }> = [
  {
    term: '.planning/',
    def: 'Project knowledge: PROJECT, JOURNEY, REQUIREMENTS, ROADMAP, STATE, REVIEW, DESIGN, plus per-phase plan/summary/verification.',
  },
  {
    term: 'STATE.md',
    def: 'The single source of truth for current phase + status. The smart router reads this.',
  },
  {
    term: 'Subagent',
    def: 'A fresh AI context that runs one task. No accumulated garbage between tasks.',
  },
  {
    term: 'Verification contract',
    def: 'A list of acceptance criteria the verifier checks against. No checks pass = phase fails.',
  },
  {
    term: 'Brain',
    def: 'The shared Obsidian vault at ~/qualia-memory. Cross-project lessons, gotchas, client prefs.',
  },
  {
    term: 'ERP',
    def: 'This app, portal.qualiasolutions.net. Tasks, projects, schedule, reports, AI assistant.',
  },
  {
    term: 'Auto-assignment',
    def: "When an admin assigns you a project, the active milestone's phase items become inbox tasks.",
  },
  {
    term: 'Session report',
    def: 'Posted to /api/v1/reports by /qualia-report. Idempotent, dry-run aware, dual-auth.',
  },
];

function ConceptsContent() {
  return (
    <div className="qm-stagger space-y-6">
      <section>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-foreground">
          The hierarchy
        </h3>
        <div className="overflow-hidden rounded-2xl border border-border bg-muted/20">
          {HIERARCHY.map((h, i) => (
            <div
              key={h.name}
              className={cn(
                'flex items-start gap-4 px-4 py-3.5',
                i < HIERARCHY.length - 1 && 'border-b border-border'
              )}
            >
              <span
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[10px] font-bold text-primary"
                style={{ marginLeft: `${i * 8}px` }}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{h.name}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{h.tagline}</p>
                <p className="mt-1 text-[11px] italic leading-snug text-muted-foreground/80">
                  e.g. {h.example}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-foreground">
          Glossary
        </h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {GLOSSARY.map((g) => (
            <div
              key={g.term}
              className="rounded-xl border border-border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
            >
              <code className="font-mono text-[12px] font-semibold text-primary">{g.term}</code>
              <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">{g.def}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
