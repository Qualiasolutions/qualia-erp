'use client';

import { useState, useEffect } from "react";
import { format, differenceInDays, isAfter, isBefore } from "date-fns";
import { Calendar, Target, AlertCircle, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface Issue {
    id: string;
    title: string;
    status: string;
    priority: string;
}

interface Milestone {
    id: string;
    name: string;
    description: string | null;
    target_date: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'delayed';
    progress: number;
    color: string;
    issues?: Issue[];
}

interface MilestoneTimelineProps {
    milestones: Milestone[];
    projectId: string;
    onMilestoneClick?: (milestone: Milestone) => void;
}

function getMilestoneStatus(milestone: Milestone): {
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
} {
    const today = new Date();
    const targetDate = new Date(milestone.target_date);
    const daysUntil = differenceInDays(targetDate, today);

    if (milestone.status === 'completed') {
        return {
            label: 'Completed',
            icon: <CheckCircle2 className="w-4 h-4" />,
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-500/10'
        };
    }

    if (daysUntil < 0 && milestone.progress < 100) {
        return {
            label: `${Math.abs(daysUntil)} days overdue`,
            icon: <AlertCircle className="w-4 h-4" />,
            color: 'text-red-600 dark:text-red-400',
            bgColor: 'bg-red-500/10'
        };
    }

    if (daysUntil <= 7 && milestone.progress < 70) {
        return {
            label: `${daysUntil} days left`,
            icon: <Clock className="w-4 h-4" />,
            color: 'text-amber-600 dark:text-amber-400',
            bgColor: 'bg-amber-500/10'
        };
    }

    if (milestone.status === 'in_progress') {
        return {
            label: `${daysUntil} days left`,
            icon: <TrendingUp className="w-4 h-4" />,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-500/10'
        };
    }

    return {
        label: 'Not started',
        icon: <Target className="w-4 h-4" />,
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-500/10'
    };
}

export function MilestoneTimeline({ milestones, projectId, onMilestoneClick }: MilestoneTimelineProps) {
    const sortedMilestones = [...milestones].sort((a, b) =>
        new Date(a.target_date).getTime() - new Date(b.target_date).getTime()
    );

    if (milestones.length === 0) {
        return (
            <div className="text-center py-8">
                <Target className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No milestones yet</p>
                <p className="text-xs text-muted-foreground mt-1">Add milestones to track project progress</p>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-7 top-8 bottom-8 w-0.5 bg-border" />

            {/* Milestone items */}
            <div className="space-y-6">
                {sortedMilestones.map((milestone, index) => {
                    const status = getMilestoneStatus(milestone);
                    const issueCount = milestone.issues?.length || 0;
                    const doneCount = milestone.issues?.filter(i => i.status === 'Done').length || 0;

                    return (
                        <div
                            key={milestone.id}
                            className="relative flex gap-4 group cursor-pointer"
                            onClick={() => onMilestoneClick?.(milestone)}
                        >
                            {/* Timeline dot */}
                            <div className="relative z-10">
                                <div
                                    className={cn(
                                        "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                                        status.bgColor,
                                        "group-hover:scale-110"
                                    )}
                                    style={{ backgroundColor: milestone.color + '20' }}
                                >
                                    <div className={status.color}>
                                        {status.icon}
                                    </div>
                                </div>

                                {/* Connector to card */}
                                <div className="absolute left-14 top-7 w-4 h-0.5 bg-border" />
                            </div>

                            {/* Milestone card */}
                            <div className="flex-1 ml-2">
                                <div className={cn(
                                    "surface rounded-xl p-5 transition-all",
                                    "group-hover:shadow-lg group-hover:border-primary/50"
                                )}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                                {milestone.name}
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(milestone.target_date), 'MMM dd, yyyy')}
                                                <span className={cn("ml-2", status.color)}>
                                                    {status.label}
                                                </span>
                                            </p>
                                        </div>

                                        {/* Milestone color indicator */}
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: milestone.color }}
                                        />
                                    </div>

                                    {milestone.description && (
                                        <p className="text-sm text-muted-foreground mb-3">
                                            {milestone.description}
                                        </p>
                                    )}

                                    {/* Progress */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">
                                                Progress
                                            </span>
                                            <span className="font-medium tabular-nums">
                                                {milestone.progress}%
                                            </span>
                                        </div>
                                        <Progress value={milestone.progress} className="h-1.5" />

                                        {issueCount > 0 && (
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {doneCount} of {issueCount} issues completed
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}