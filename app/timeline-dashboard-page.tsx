import { TimelineDashboardClient } from '@/components/timeline-dashboard';

/**
 * Timeline Dashboard Page - Team daily schedule with 8:30 AM - 2:30 PM view
 * Shows Fawzi and Moayad's tasks in 50/50 split lanes
 */
export default function TimelineDashboardPage() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 p-6 md:p-8">
      <TimelineDashboardClient />
    </main>
  );
}
