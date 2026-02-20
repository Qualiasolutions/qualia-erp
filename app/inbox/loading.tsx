import { Skeleton } from '@/components/ui/skeleton';
import { Inbox, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function InboxLoading() {
  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 ring-1 ring-white/10">
              <Inbox className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <Skeleton className="h-5 w-16 bg-zinc-800" />
              <Skeleton className="mt-1 h-3 w-20 bg-zinc-800" />
            </div>
          </div>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full bg-zinc-800" />
          ))}
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex items-center gap-4 border-b border-white/[0.06] px-6 py-3">
        <Skeleton className="h-9 w-64 rounded-md bg-zinc-800" />
        <Skeleton className="h-9 w-32 rounded-md bg-zinc-800" />
        <Skeleton className="h-9 w-32 rounded-md bg-zinc-800" />
        <div className="flex-1" />
        <Skeleton className="h-9 w-64 rounded-md bg-zinc-800" />
        <Skeleton className="h-9 w-20 rounded-md bg-zinc-800" />
      </div>

      {/* Table Header */}
      <div className="flex items-center border-b border-white/[0.06] bg-zinc-900/50 px-6 py-2">
        <Skeleton className="h-3 w-5 bg-zinc-700" />
        <Skeleton className="ml-4 h-3 w-12 bg-zinc-700" />
        <div className="flex-1" />
        <Skeleton className="hidden h-3 w-16 bg-zinc-700 md:block" />
        <Skeleton className="ml-8 hidden h-3 w-10 bg-zinc-700 sm:block" />
        <Skeleton className="ml-8 h-3 w-16 bg-zinc-700" />
        <div className="w-20" />
      </div>

      {/* Task Rows */}
      <div className="flex-1 overflow-hidden">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="flex animate-pulse items-center gap-4 border-b border-white/[0.04] px-6 py-4"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <Skeleton className="h-5 w-5 rounded-md bg-zinc-700" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-3/4 bg-zinc-700" />
              <Skeleton className="mt-1.5 h-3 w-1/2 bg-zinc-800" />
            </div>
            <Skeleton className="hidden h-4 w-24 bg-zinc-800 md:block" />
            <Skeleton className="hidden h-4 w-16 bg-zinc-800 sm:block" />
            <Skeleton className="h-6 w-16 rounded-md bg-zinc-800" />
            <div className="w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
