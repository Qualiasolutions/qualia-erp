'use client';

import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import {
  CalendarDays,
  ExternalLink,
  ListChecks,
  Lightbulb,
  HelpCircle,
  BookOpen,
  Users,
  Sparkles,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type ParticipantMeta = { name?: string | null; email?: string | null; attended?: boolean | null };
type ChapterSummary = { title?: string | null; description?: string | null };

export interface MeetingBriefData {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  meeting_link?: string | null;
  report_url?: string | null;
  recording_url?: string | null;
  read_ai_session_id?: string | null;
  summary?: string | null;
  topics?: unknown;
  action_items?: unknown;
  key_questions?: unknown;
  chapter_summaries?: unknown;
  participants_meta?: unknown;
  project?: { id: string; name: string } | null;
  client?: { id: string; display_name: string } | null;
}

interface MeetingBriefModalProps {
  meeting: MeetingBriefData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Heuristic: a string is "RTL-leaning" if it has any Arabic / Hebrew chars.
const RTL_RE = /[֐-׿؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
function isRtl(s: string | null | undefined): boolean {
  return !!s && RTL_RE.test(s);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function asChapterArray(value: unknown): ChapterSummary[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is ChapterSummary =>
      typeof v === 'object' && v !== null && ('title' in v || 'description' in v)
  );
}

function asParticipantArray(value: unknown): ParticipantMeta[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is ParticipantMeta => typeof v === 'object' && v !== null);
}

export function MeetingBriefModal({ meeting, open, onOpenChange }: MeetingBriefModalProps) {
  const data = useMemo(() => {
    if (!meeting) return null;
    return {
      summary: meeting.summary?.trim() || null,
      actionItems: asStringArray(meeting.action_items),
      topics: asStringArray(meeting.topics),
      keyQuestions: asStringArray(meeting.key_questions),
      chapters: asChapterArray(meeting.chapter_summaries),
      participants: asParticipantArray(meeting.participants_meta),
    };
  }, [meeting]);

  if (!meeting || !data) return null;

  const rtlTitle = isRtl(meeting.title);
  const start = parseISO(meeting.start_time);
  const end = parseISO(meeting.end_time);
  const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));

  const hasIntelligence =
    data.summary ||
    data.actionItems.length ||
    data.topics.length ||
    data.keyQuestions.length ||
    data.chapters.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-hidden border-border bg-card p-0 text-foreground sm:max-w-[640px] sm:rounded-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border bg-gradient-to-br from-primary/5 to-transparent px-6 py-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" aria-hidden />
                Read.ai brief
              </span>
              {meeting.project && (
                <span className="truncate rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {meeting.project.name}
                </span>
              )}
            </div>
            <DialogTitle
              dir={rtlTitle ? 'rtl' : 'ltr'}
              className={cn('mt-2 text-lg font-semibold tracking-tight', rtlTitle && 'text-right')}
            >
              {meeting.title}
            </DialogTitle>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" aria-hidden />
              {format(start, 'EEE, MMM d')} · {format(start, 'h:mm a')}–{format(end, 'h:mm a')} ·{' '}
              {duration} min
            </p>
          </div>
          {meeting.report_url && (
            <a
              href={meeting.report_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              Open in Read.ai
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          )}
        </header>

        <div className="max-h-[calc(90vh-100px)] overflow-y-auto">
          {!hasIntelligence ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No Read.ai brief is attached to this meeting yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.summary && (
                <Section icon={<BookOpen className="h-3.5 w-3.5" />} title="Summary">
                  <Paragraphs text={data.summary} />
                </Section>
              )}

              {data.actionItems.length > 0 && (
                <Section
                  icon={<ListChecks className="h-3.5 w-3.5" />}
                  title={`Action items (${data.actionItems.length})`}
                  iconClassName="text-amber-500"
                >
                  <ul className="space-y-2">
                    {data.actionItems.map((item, i) => (
                      <BulletItem key={i} text={item} marker="amber" />
                    ))}
                  </ul>
                </Section>
              )}

              {data.topics.length > 0 && (
                <Section
                  icon={<Lightbulb className="h-3.5 w-3.5" />}
                  title={`Topics (${data.topics.length})`}
                  iconClassName="text-violet-500"
                >
                  <ul className="space-y-2">
                    {data.topics.map((item, i) => (
                      <BulletItem key={i} text={item} marker="violet" />
                    ))}
                  </ul>
                </Section>
              )}

              {data.keyQuestions.length > 0 && (
                <Section
                  icon={<HelpCircle className="h-3.5 w-3.5" />}
                  title={`Key questions (${data.keyQuestions.length})`}
                  iconClassName="text-sky-500"
                >
                  <ul className="space-y-2">
                    {data.keyQuestions.map((item, i) => (
                      <BulletItem key={i} text={item} marker="sky" />
                    ))}
                  </ul>
                </Section>
              )}

              {data.chapters.length > 0 && (
                <Section
                  icon={<BookOpen className="h-3.5 w-3.5" />}
                  title={`Chapters (${data.chapters.length})`}
                  iconClassName="text-emerald-500"
                >
                  <ol className="space-y-3">
                    {data.chapters.map((c, i) => {
                      const title = c.title?.trim() || `Chapter ${i + 1}`;
                      const desc = c.description?.trim() || '';
                      const rtlChapter = isRtl(title) || isRtl(desc);
                      return (
                        <li
                          key={i}
                          className="rounded-lg border border-border bg-background/50 p-3"
                          dir={rtlChapter ? 'rtl' : 'ltr'}
                        >
                          <p
                            className={cn(
                              'text-sm font-medium text-foreground',
                              rtlChapter && 'text-right'
                            )}
                          >
                            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/10 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              {i + 1}
                            </span>
                            {title}
                          </p>
                          {desc && (
                            <p
                              className={cn(
                                'mt-1.5 text-xs leading-relaxed text-muted-foreground',
                                rtlChapter && 'text-right'
                              )}
                            >
                              {desc}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </Section>
              )}

              {data.participants.length > 0 && (
                <Section
                  icon={<Users className="h-3.5 w-3.5" />}
                  title={`Participants (${data.participants.length})`}
                >
                  <div className="flex flex-wrap gap-1.5">
                    {data.participants.map((p, i) => {
                      const name = p.name?.trim() || p.email || 'Unknown';
                      const rtlName = isRtl(name);
                      return (
                        <span
                          key={i}
                          dir={rtlName ? 'rtl' : 'ltr'}
                          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-foreground"
                          title={p.email || undefined}
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              p.attended ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                            )}
                            aria-label={p.attended ? 'attended' : 'invited'}
                          />
                          {name}
                        </span>
                      );
                    })}
                  </div>
                </Section>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  icon,
  title,
  iconClassName,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  iconClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-6 py-5">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span className={cn('text-muted-foreground', iconClassName)}>{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Paragraphs({ text }: { text: string }) {
  const rtl = isRtl(text);
  const parts = text.split(/\n{2,}/g);
  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className={cn('space-y-3 text-sm leading-relaxed text-foreground/90', rtl && 'text-right')}
    >
      {parts.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

const MARKER_CLASS: Record<string, string> = {
  amber: 'bg-amber-500',
  violet: 'bg-violet-500',
  sky: 'bg-sky-500',
};

function BulletItem({ text, marker }: { text: string; marker: keyof typeof MARKER_CLASS }) {
  const rtl = isRtl(text);
  return (
    <li
      dir={rtl ? 'rtl' : 'ltr'}
      className={cn('flex gap-2.5 text-sm leading-relaxed text-foreground/90', rtl && 'text-right')}
    >
      <span
        className={cn(
          'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
          MARKER_CLASS[marker] || 'bg-muted-foreground'
        )}
        aria-hidden
      />
      <span className="flex-1">{text}</span>
    </li>
  );
}
