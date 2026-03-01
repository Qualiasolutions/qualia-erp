import { Skeleton } from '@/components/ui/skeleton';
import { Inbox, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function InboxLoading() {
  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/30 px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 ring-1 ring-border/40">
              <Inbox className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <Skeleton className="h-5 w-16 bg-muted" />
              <Skeleton className="mt-1 h-3 w-20 bg-muted" />
            </div>
          </div>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full bg-muted" />
          ))}
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex items-center gap-4 border-b border-border/30 px-6 py-3">
        <Skeleton className="h-9 w-64 rounded-md bg-muted" />
        <Skeleton className="h-9 w-32 rounded-md bg-muted" />
        <Skeleton className="h-9 w-32 rounded-md bg-muted" />
        <div className="flex-1" />
        <Skeleton className="h-9 w-64 rounded-md bg-muted" />
        <Skeleton className="h-9 w-20 rounded-md bg-muted" />
      </div>

      {/* Table Header */}
      <div className="flex items-center border-b border-border/30 bg-muted/50 px-6 py-2">
        <Skeleton className="h-3 w-5 bg-muted" />
        <Skeleton className="ml-4 h-3 w-12 bg-muted" />
        <div className="flex-1" />
        <Skeleton className="hidden h-3 w-16 bg-muted md:block" />
        <Skeleton className="ml-8 hidden h-3 w-10 bg-muted sm:block" />
        <Skeleton className="ml-8 h-3 w-16 bg-muted" />
        <div className="w-20" />
      </div>

      {/* Task Rows */}
      <div className="flex-1 overflow-hidden">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="flex animate-pulse items-center gap-4 border-b border-border/20 px-6 py-4"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <Skeleton className="h-5 w-5 rounded-md bg-muted" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-3/4 bg-muted" />
              <Skeleton className="mt-1.5 h-3 w-1/2 bg-muted" />
            </div>
            <Skeleton className="hidden h-4 w-24 bg-muted md:block" />
            <Skeleton className="hidden h-4 w-16 bg-muted sm:block" />
            <Skeleton className="h-6 w-16 rounded-md bg-muted" />
            <div className="w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
