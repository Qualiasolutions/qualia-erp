import { DailyFlowClient } from '@/components/daily-flow';

/**
 * Daily Flow Page - Unified dashboard for team scheduling
 * Replaces both the old dashboard and team page
 */
export default function DailyFlowPage() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 p-6 md:p-8">
      <DailyFlowClient />
    </main>
  );
}
