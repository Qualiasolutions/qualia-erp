'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { format } from 'date-fns';
import { Loader2, MessageSquare, RefreshCw, User2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  getAIPromptConversations,
  getAIPromptConversationDetail,
  getAIPromptUsers,
  type AIPromptConversation,
  type AIPromptConversationDetail,
  type AIPromptUserOption,
} from '@/app/actions/ai-prompt-logs';

const ALL = '__all__';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-[26px] font-semibold tabular-nums leading-none tracking-tight text-foreground">
        {value}
      </div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground/80">{sub}</div>}
    </div>
  );
}

function truncate(text: string | null, max = 140): string {
  if (!text) return '—';
  const single = text.replace(/\s+/g, ' ').trim();
  return single.length > max ? `${single.slice(0, max)}…` : single;
}

export function AIPromptsTab({
  fromDate,
  toDate,
}: {
  fromDate: Date | undefined;
  toDate: Date | undefined;
}) {
  const [rows, setRows] = useState<AIPromptConversation[]>([]);
  const [users, setUsers] = useState<AIPromptUserOption[]>([]);
  const [filterUser, setFilterUser] = useState<string>(ALL);
  const [loadedUsers, setLoadedUsers] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [openConversationId, setOpenConversationId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AIPromptConversationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fromIso = useMemo(
    () => (fromDate ? new Date(fromDate.setHours(0, 0, 0, 0)).toISOString() : undefined),
    [fromDate]
  );
  const toIso = useMemo(
    () => (toDate ? new Date(toDate.setHours(23, 59, 59, 999)).toISOString() : undefined),
    [toDate]
  );

  const load = useCallback(() => {
    startTransition(async () => {
      const [conversations, userList] = await Promise.all([
        getAIPromptConversations({
          from: fromIso,
          to: toIso,
          profileId: filterUser === ALL ? undefined : filterUser,
          limit: 200,
        }),
        loadedUsers ? Promise.resolve(users) : getAIPromptUsers(),
      ]);
      setRows(conversations);
      if (!loadedUsers) {
        setUsers(userList);
        setLoadedUsers(true);
      }
    });
  }, [fromIso, toIso, filterUser, loadedUsers, users]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = useCallback(async (conversationId: string) => {
    setOpenConversationId(conversationId);
    setDetail(null);
    setDetailLoading(true);
    const d = await getAIPromptConversationDetail(conversationId);
    setDetail(d);
    setDetailLoading(false);
  }, []);

  const totalConversations = rows.length;
  const totalUserPrompts = rows.reduce((acc, r) => acc + r.userMessageCount, 0);
  const distinctEmployees = new Set(rows.map((r) => r.userId)).size;

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Conversations"
          value={totalConversations}
          sub={isPending ? 'loading…' : 'in selected range'}
        />
        <StatCard label="User prompts" value={totalUserPrompts} sub="messages from employees" />
        <StatCard label="Employees" value={distinctEmployees} sub="distinct users" />
        <StatCard
          label="Filter"
          value={
            filterUser === ALL
              ? 'All'
              : truncate(users.find((u) => u.profileId === filterUser)?.fullName ?? '—', 22)
          }
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="h-9 w-[220px] text-xs">
            <SelectValue placeholder="All employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All employees</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.profileId} value={u.profileId}>
                {u.fullName} · {u.conversationCount}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          onClick={load}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          Refresh
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          Showing first user prompt per conversation. Click a row for the full thread.
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
          <MessageSquare className="mb-3 size-6 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {isPending ? 'Loading…' : 'No conversations in this range.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[180px]">Employee</TableHead>
                <TableHead>First prompt</TableHead>
                <TableHead className="w-[90px] text-right">Prompts</TableHead>
                <TableHead className="w-[160px]">Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => openDetail(row.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-[10px] font-semibold text-primary">
                          {row.userName[0]?.toUpperCase() ?? '?'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{row.userName}</div>
                        {row.userEmail && (
                          <div className="truncate text-[11px] text-muted-foreground">
                            {row.userEmail}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="line-clamp-2 text-sm text-foreground">
                      {truncate(row.firstPrompt, 200)}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {row.title && row.title !== 'New Conversation' ? row.title : '—'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {row.userMessageCount}
                    <span className="ml-1 text-[11px] text-muted-foreground">
                      / {row.messageCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(row.lastActivityAt), 'MMM d, HH:mm')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet
        open={openConversationId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setOpenConversationId(null);
            setDetail(null);
          }
        }}
      >
        <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-2xl">
          <SheetHeader className="border-b border-border px-6 py-5">
            <SheetTitle className="text-base font-semibold">
              {detail?.userName ?? 'Conversation'}
            </SheetTitle>
            {detail && (
              <p className="text-xs text-muted-foreground">
                {detail.messageCount} messages · {detail.userMessageCount} prompts ·{' '}
                {format(new Date(detail.createdAt), 'MMM d, yyyy HH:mm')}
              </p>
            )}
          </SheetHeader>
          <div className="flex-1 overflow-auto">
            {detailLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : !detail || detail.messages.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                No messages.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {detail.messages.map((m) => (
                  <MessageRow
                    key={m.id}
                    role={m.role}
                    content={m.content}
                    createdAt={m.createdAt}
                  />
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MessageRow({
  role,
  content,
  createdAt,
}: {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  createdAt: string;
}) {
  const label =
    role === 'user' ? 'Employee prompt' : role === 'assistant' ? 'Qualia AI' : 'Tool call';
  return (
    <li
      className={cn(
        'px-6 py-4',
        role === 'user' && 'bg-primary/[0.03]',
        role === 'tool' && 'bg-muted/30'
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              'flex size-5 items-center justify-center rounded',
              role === 'user' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
            )}
          >
            <User2 className="size-3" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            {label}
          </span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground/70">
          {format(new Date(createdAt), 'MMM d HH:mm:ss')}
        </span>
      </div>
      <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-foreground">
        {content || '(empty)'}
      </pre>
    </li>
  );
}
