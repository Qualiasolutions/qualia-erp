'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  format,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachMonthOfInterval,
  eachWeekOfInterval,
  eachDayOfInterval,
  addMonths,
  addWeeks,
  subMonths,
  subWeeks,
  isBefore,
  isAfter,
  isToday,
} from 'date-fns';
import { Bot, Globe, Search, Megaphone, Folder, Calendar, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/components/project-list';
import type { ProjectType } from '@/types/database';

interface ProjectTimelineProps {
  projects: Project[];
}

const PROJECT_TYPE_CONFIG: Record<
  ProjectType,
  { icon: typeof Globe; color: string; bgColor: string; barColor: string }
> = {
  web_design: {
    icon: Globe,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    barColor: 'bg-gradient-to-r from-blue-500 to-blue-400',
  },
  ai_agent: {
    icon: Bot,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    barColor: 'bg-gradient-to-r from-purple-500 to-purple-400',
  },
  voice_agent: {
    icon: Phone,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    barColor: 'bg-gradient-to-r from-pink-500 to-pink-400',
  },
  seo: {
    icon: Search,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    barColor: 'bg-gradient-to-r from-green-500 to-green-400',
  },
  ads: {
    icon: Megaphone,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    barColor: 'bg-gradient-to-r from-orange-500 to-orange-400',
  },
};

const DEFAULT_BAR_COLOR = 'bg-gradient-to-r from-violet-500 to-violet-400';

type ZoomLevel = 'days' | 'weeks' | 'months';

const ZOOM_CONFIG: Record<ZoomLevel, { dayWidth: number; label: string }> = {
  days: { dayWidth: 40, label: 'Day' },
  weeks: { dayWidth: 12, label: 'Week' },
  months: { dayWidth: 4, label: 'Month' },
};

export function ProjectTimeline({ projects }: ProjectTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('months');
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);

  const dayWidth = ZOOM_CONFIG[zoomLevel].dayWidth;

  // Calculate the date range for the timeline
  const { timelineStart, timelineEnd, timeUnits } = useMemo(() => {
    const now = new Date();
    const projectsWithDates = projects.filter((p) => p.start_date || p.target_date);

    let earliestDate = now;
    let latestDate = now;

    if (projectsWithDates.length > 0) {
      projectsWithDates.forEach((p) => {
        const startDate = p.start_date ? new Date(p.start_date) : null;
        const endDate = p.target_date ? new Date(p.target_date) : null;

        if (startDate && isBefore(startDate, earliestDate)) {
          earliestDate = startDate;
        }
        if (endDate && isAfter(endDate, latestDate)) {
          latestDate = endDate;
        }
      });
    }

    // Add padding based on zoom level
    let start: Date;
    let end: Date;

    if (zoomLevel === 'days') {
      start = subWeeks(startOfWeek(earliestDate, { weekStartsOn: 1 }), 1);
      end = addWeeks(endOfWeek(latestDate, { weekStartsOn: 1 }), 2);
    } else if (zoomLevel === 'weeks') {
      start = subWeeks(startOfWeek(earliestDate, { weekStartsOn: 1 }), 2);
      end = addWeeks(endOfWeek(latestDate, { weekStartsOn: 1 }), 4);
    } else {
      start = subMonths(startOfMonth(earliestDate), 1);
      end = addMonths(endOfMonth(latestDate), 2);
    }

    // Generate time units based on zoom level
    let units: Date[];
    if (zoomLevel === 'days') {
      units = eachDayOfInterval({ start, end });
    } else if (zoomLevel === 'weeks') {
      units = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    } else {
      units = eachMonthOfInterval({ start, end });
    }

    return {
      timelineStart: start,
      timelineEnd: end,
      timeUnits: units,
    };
  }, [projects, zoomLevel]);

  const totalDays = differenceInDays(timelineEnd, timelineStart);
  const timelineWidth = totalDays * dayWidth;

  // Scroll to today on mount
  useEffect(() => {
    if (containerRef.current) {
      const today = new Date();
      const daysFromStart = differenceInDays(today, timelineStart);
      const scrollPosition = daysFromStart * dayWidth - containerRef.current.clientWidth / 2;
      containerRef.current.scrollLeft = Math.max(0, scrollPosition);
    }
  }, [timelineStart, dayWidth]);

  const getProjectPosition = (project: Project) => {
    const startDate = project.start_date ? new Date(project.start_date) : new Date();
    const endDate = project.target_date ? new Date(project.target_date) : addMonths(startDate, 1);

    const startDays = Math.max(0, differenceInDays(startDate, timelineStart));
    const duration = Math.max(7, differenceInDays(endDate, startDate)); // Minimum 7 days width

    return {
      left: startDays * dayWidth,
      width: duration * dayWidth,
    };
  };

  const todayPosition = differenceInDays(new Date(), timelineStart) * dayWidth;

  // Group projects by type for better visualization
  // 100% completed projects go to the bottom
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      // 100% completed projects go to bottom
      const aComplete = (a.roadmap_progress || 0) >= 100;
      const bComplete = (b.roadmap_progress || 0) >= 100;
      if (aComplete !== bComplete) return aComplete ? 1 : -1;

      // Sort by type first, then by start date
      const typeOrder: Record<string, number> = {
        ai_agent: 1,
        web_design: 2,
        seo: 3,
        ads: 4,
      };
      const typeA = typeOrder[a.project_type || ''] || 5;
      const typeB = typeOrder[b.project_type || ''] || 5;
      if (typeA !== typeB) return typeA - typeB;

      const dateA = a.start_date ? new Date(a.start_date) : new Date();
      const dateB = b.start_date ? new Date(b.start_date) : new Date();
      return dateA.getTime() - dateB.getTime();
    });
  }, [projects]);

  if (projects.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border text-center">
        <Calendar className="mb-3 h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No projects to display on timeline</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Add projects with start and target dates
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Zoom:</span>
          <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
            {(['months', 'weeks', 'days'] as ZoomLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => setZoomLevel(level)}
                className={cn(
                  'rounded px-2 py-1 text-xs font-medium transition-all',
                  zoomLevel === level
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {ZOOM_CONFIG[level].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Timeline Container */}
      <div className="rounded-lg border border-border bg-card">
        <div
          ref={containerRef}
          className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border overflow-x-auto"
        >
          <div style={{ width: timelineWidth, minWidth: '100%' }}>
            {/* Header */}
            <div className="sticky top-0 z-10 flex border-b border-border bg-card/95 backdrop-blur-sm">
              <div className="w-48 flex-shrink-0 border-r border-border px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">Project</span>
              </div>
              <div className="relative flex-1">
                {/* Days header */}
                {zoomLevel === 'days' && (
                  <div className="flex">
                    {timeUnits.map((day, i) => {
                      const isCurrentDay = isToday(day);
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      return (
                        <div
                          key={i}
                          className={cn(
                            'flex-shrink-0 border-r border-border/50 px-1 py-2 text-center',
                            isCurrentDay && 'bg-red-500/10',
                            isWeekend && !isCurrentDay && 'bg-muted/30'
                          )}
                          style={{ width: dayWidth }}
                        >
                          <div className="text-[10px] font-medium text-muted-foreground">
                            {format(day, 'EEE')}
                          </div>
                          <div
                            className={cn(
                              'text-xs font-semibold',
                              isCurrentDay ? 'text-red-500' : 'text-foreground'
                            )}
                          >
                            {format(day, 'd')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Weeks header */}
                {zoomLevel === 'weeks' && (
                  <div className="flex">
                    {timeUnits.map((week, i) => {
                      const weekEnd = endOfWeek(week, { weekStartsOn: 1 });
                      const width = 7 * dayWidth;
                      return (
                        <div
                          key={i}
                          className="flex-shrink-0 border-r border-border/50 px-2 py-2"
                          style={{ width }}
                        >
                          <div className="text-[10px] text-muted-foreground">
                            {format(week, 'MMM yyyy')}
                          </div>
                          <div className="text-xs font-medium text-foreground">
                            {format(week, 'd')} - {format(weekEnd, 'd')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Months header */}
                {zoomLevel === 'months' && (
                  <div className="flex">
                    {timeUnits.map((month, i) => {
                      const monthStart = startOfMonth(month);
                      const daysInMonth = differenceInDays(endOfMonth(month), monthStart) + 1;
                      const width = daysInMonth * dayWidth;

                      return (
                        <div
                          key={i}
                          className="flex-shrink-0 border-r border-border/50 px-2 py-2"
                          style={{ width }}
                        >
                          <span className="text-xs font-medium text-foreground">
                            {format(month, 'MMM yyyy')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Project rows */}
            <div className="relative">
              {/* Today line */}
              <div
                className="absolute bottom-0 top-0 z-20 w-px bg-red-500"
                style={{ left: 192 + todayPosition }}
              >
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 rounded-b bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Today
                </div>
              </div>

              {sortedProjects.map((project) => {
                const { left, width } = getProjectPosition(project);
                const typeConfig = project.project_type
                  ? PROJECT_TYPE_CONFIG[project.project_type]
                  : null;
                const TypeIcon = typeConfig?.icon || Folder;
                const isHovered = hoveredProject === project.id;
                const progress = project.roadmap_progress || 0;

                return (
                  <div
                    key={project.id}
                    className={cn(
                      'group flex border-b border-border/50 transition-colors',
                      isHovered && 'bg-secondary/50'
                    )}
                    onMouseEnter={() => setHoveredProject(project.id)}
                    onMouseLeave={() => setHoveredProject(null)}
                  >
                    {/* Project name column */}
                    <Link
                      href={`/projects/${project.id}`}
                      className="flex w-48 flex-shrink-0 items-center gap-2 border-r border-border px-3 py-3 hover:bg-secondary/50"
                    >
                      <div
                        className={cn(
                          'flex-shrink-0 rounded p-1',
                          typeConfig?.bgColor || 'bg-violet-500/10'
                        )}
                      >
                        <TypeIcon
                          className={cn('h-3 w-3', typeConfig?.color || 'text-violet-500')}
                        />
                      </div>
                      <span className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                        {project.name}
                      </span>
                    </Link>

                    {/* Timeline bar area */}
                    <div className="relative flex-1 py-2">
                      {/* Background grid lines */}
                      <div className="absolute inset-0 flex">
                        {zoomLevel === 'days' &&
                          timeUnits.map((day, i) => {
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                            return (
                              <div
                                key={i}
                                className={cn(
                                  'flex-shrink-0 border-r border-border/20',
                                  isWeekend && 'bg-muted/20'
                                )}
                                style={{ width: dayWidth }}
                              />
                            );
                          })}
                        {zoomLevel === 'weeks' &&
                          timeUnits.map((_, i) => (
                            <div
                              key={i}
                              className="flex-shrink-0 border-r border-border/20"
                              style={{ width: 7 * dayWidth }}
                            />
                          ))}
                        {zoomLevel === 'months' &&
                          timeUnits.map((month, i) => {
                            const daysInMonth =
                              differenceInDays(endOfMonth(month), startOfMonth(month)) + 1;
                            return (
                              <div
                                key={i}
                                className="flex-shrink-0 border-r border-border/20"
                                style={{ width: daysInMonth * dayWidth }}
                              />
                            );
                          })}
                      </div>

                      {/* Project bar */}
                      <div
                        className={cn(
                          'absolute top-1/2 -translate-y-1/2 cursor-pointer rounded-full transition-all duration-200',
                          isHovered ? 'z-10 scale-y-125 shadow-lg' : 'scale-y-100'
                        )}
                        style={{
                          left,
                          width: Math.max(width, 20),
                          height: isHovered ? 24 : 20,
                        }}
                      >
                        {/* Background bar */}
                        <div
                          className={cn(
                            'absolute inset-0 rounded-full opacity-30',
                            typeConfig?.barColor || DEFAULT_BAR_COLOR
                          )}
                        />
                        {/* Progress fill */}
                        <div
                          className={cn(
                            'absolute inset-y-0 left-0 rounded-full transition-all',
                            typeConfig?.barColor || DEFAULT_BAR_COLOR
                          )}
                          style={{ width: `${progress}%` }}
                        />
                        {/* Progress text */}
                        {width > 40 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-semibold text-white drop-shadow-sm">
                              {progress}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Hover tooltip */}
                      {isHovered && (
                        <div
                          className="absolute z-30 rounded-lg border border-border bg-popover p-3 shadow-xl"
                          style={{
                            left: left + width / 2,
                            top: '100%',
                            transform: 'translateX(-50%)',
                            marginTop: 8,
                          }}
                        >
                          <div className="whitespace-nowrap">
                            <p className="font-medium text-foreground">{project.name}</p>
                            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                              {project.start_date && (
                                <span>Start: {format(new Date(project.start_date), 'MMM d')}</span>
                              )}
                              {project.target_date && (
                                <span>Due: {format(new Date(project.target_date), 'MMM d')}</span>
                              )}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
                                <div
                                  className={cn(
                                    'h-full rounded-full',
                                    typeConfig?.barColor || DEFAULT_BAR_COLOR
                                  )}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium">{progress}%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
