import { Suspense } from "react";
import { connection } from "next/server";
import { getMeetings } from "@/app/actions";
import { MeetingList } from "@/components/meeting-list";
import { NewMeetingModal } from "@/components/new-meeting-modal";
import { CalendarView } from "@/components/calendar-view";
import { DayScheduleView } from "@/components/day-schedule-view";
import { ScheduleViewToggle } from "@/components/schedule-view-toggle";

async function ScheduleLoader({ view }: { view: string }) {
    await connection();
    const meetings = await getMeetings();

    if (view === 'calendar') {
        return <CalendarView meetings={meetings} />;
    }

    if (view === 'list') {
        return <MeetingList meetings={meetings} />;
    }

    // Default to day view
    return <DayScheduleView meetings={meetings} />;
}

function ScheduleSkeleton() {
    return (
        <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-lg bg-white/[0.05]" />
                        <div className="flex-1 space-y-2">
                            <div className="w-48 h-5 bg-white/[0.05] rounded" />
                            <div className="w-32 h-4 bg-white/[0.05] rounded" />
                            <div className="flex gap-4 pt-1">
                                <div className="w-24 h-4 bg-white/[0.05] rounded" />
                                <div className="w-20 h-4 bg-white/[0.05] rounded" />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default async function SchedulePage({
    searchParams,
}: {
    searchParams: Promise<{ view?: string }>;
}) {
    const params = await searchParams;
    const view = params.view || 'day';

    return (
        <div className="relative flex flex-col h-full">
            {/* Background effects */}
            <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
            <div className="fixed inset-0 bg-gradient-to-br from-neon-purple/5 via-transparent to-qualia-500/5 pointer-events-none" />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-background/80 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-neon-purple/10 border border-neon-purple/20">
                            <svg className="w-5 h-5 text-neon-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-foreground">Schedule</h1>
                            <p className="text-xs text-muted-foreground">Manage your upcoming meetings and events</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <ScheduleViewToggle currentView={view} />
                    <NewMeetingModal />
                </div>
            </header>

            {/* Content */}
            <div className="relative z-10 flex-1 overflow-y-auto p-6">
                <Suspense fallback={<ScheduleSkeleton />}>
                    <ScheduleLoader view={view} />
                </Suspense>
            </div>
        </div>
    );
}
