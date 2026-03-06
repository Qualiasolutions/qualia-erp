'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Play, Square, Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminContext } from '@/components/admin-provider';
import { useProjects } from '@/lib/swr';
import {
  startTimer,
  stopTimer,
  createTimeEntry,
  deleteTimeEntry,
  getDailyTimeEntries,
  getWeeklySummary,
  getRunningTimer,
} from '@/app/actions/time-tracking';
import { format, startOfWeek, endOfWeek } from 'date-fns';

export default function TimeTrackingPage() {
  const router = useRouter();
  const { isManagerOrAbove, loading: authLoading, userId } = useAdminContext();
  const { projects } = useProjects();

  // States
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedWeekStart, setSelectedWeekStart] = useState(
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  );
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [runningTimer, setRunningTimer] = useState<Record<string, unknown> | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [dailyEntries, setDailyEntries] = useState<Record<string, unknown>[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  // Manual entry form
  const [manualForm, setManualForm] = useState({
    projectId: '',
    description: '',
    hours: '',
    minutes: '',
  });

  // Timer form
  const [timerForm, setTimerForm] = useState({
    projectId: '',
    description: '',
  });

  // Redirect if not admin/manager
  useEffect(() => {
    if (!authLoading && !isManagerOrAbove) {
      router.push('/');
    }
  }, [authLoading, isManagerOrAbove, router]);

  // Fetch running timer
  useEffect(() => {
    if (!userId) return;
    const fetchRunningTimer = async () => {
      const result = await getRunningTimer(userId);
      if (result.success && result.data) {
        setRunningTimer(result.data);
      }
    };
    fetchRunningTimer();
    const interval = setInterval(fetchRunningTimer, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [userId]);

  // Update elapsed time for running timer
  useEffect(() => {
    if (!runningTimer) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = new Date(runningTimer.start_time).getTime();
    const updateElapsed = () => {
      const now = new Date().getTime();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedSeconds(elapsed);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [runningTimer]);

  // Fetch daily entries
  useEffect(() => {
    const fetchDailyEntries = async () => {
      const result = await getDailyTimeEntries(selectedDate);
      if (result.success) {
        setDailyEntries((result.data as Record<string, unknown>[]) || []);
      }
    };
    fetchDailyEntries();
  }, [selectedDate]);

  // Fetch weekly summary
  useEffect(() => {
    const weekStart = startOfWeek(new Date(selectedWeekStart), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const fetchWeeklySummary = async () => {
      const result = await getWeeklySummary(
        format(weekStart, 'yyyy-MM-dd'),
        format(weekEnd, 'yyyy-MM-dd')
      );
      if (result.success) {
        setWeeklySummary(result.data);
      }
    };
    fetchWeeklySummary();
  }, [selectedWeekStart]);

  // Format seconds to HH:MM:SS
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format seconds to hours (decimal)
  const formatHours = (seconds: number) => {
    return (seconds / 3600).toFixed(2);
  };

  // Handle start timer
  const handleStartTimer = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await startTimer(
        timerForm.projectId || undefined,
        undefined,
        timerForm.description || undefined
      );
      if (result.success) {
        setRunningTimer(result.data as Record<string, unknown> | null);
        setTimerForm({ projectId: '', description: '' });
      } else {
        alert(result.error || 'Failed to start timer');
      }
    } catch (error) {
      console.error('Error starting timer:', error);
      alert('Failed to start timer');
    } finally {
      setLoading(false);
    }
  };

  // Handle stop timer
  const handleStopTimer = async () => {
    if (!runningTimer || loading) return;
    setLoading(true);
    try {
      const result = await stopTimer(runningTimer.id);
      if (result.success) {
        setRunningTimer(null);
        setElapsedSeconds(0);
        // Refresh daily entries
        const entriesResult = await getDailyTimeEntries(selectedDate);
        if (entriesResult.success) {
          setDailyEntries((entriesResult.data as Record<string, unknown>[]) || []);
        }
      } else {
        alert(result.error || 'Failed to stop timer');
      }
    } catch (error) {
      console.error('Error stopping timer:', error);
      alert('Failed to stop timer');
    } finally {
      setLoading(false);
    }
  };

  // Handle manual entry
  const handleManualEntry = async () => {
    if (loading) return;
    if (!manualForm.hours && !manualForm.minutes) {
      alert('Please enter duration');
      return;
    }

    setLoading(true);
    try {
      const hours = parseInt(manualForm.hours || '0');
      const minutes = parseInt(manualForm.minutes || '0');
      const durationSeconds = hours * 3600 + minutes * 60;

      const result = await createTimeEntry({
        entry_date: selectedDate,
        project_id: manualForm.projectId || null,
        description: manualForm.description || null,
        duration_seconds: durationSeconds,
        start_time: new Date().toISOString(), // Placeholder
        end_time: new Date().toISOString(), // Placeholder
      });

      if (result.success) {
        setManualForm({ projectId: '', description: '', hours: '', minutes: '' });
        setShowManualEntry(false);
        // Refresh daily entries
        const entriesResult = await getDailyTimeEntries(selectedDate);
        if (entriesResult.success) {
          setDailyEntries((entriesResult.data as Record<string, unknown>[]) || []);
        }
      } else {
        alert(result.error || 'Failed to create entry');
      }
    } catch (error) {
      console.error('Error creating entry:', error);
      alert('Failed to create entry');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Delete this time entry?')) return;
    setLoading(true);
    try {
      const result = await deleteTimeEntry(entryId);
      if (result.success) {
        // Refresh daily entries
        const entriesResult = await getDailyTimeEntries(selectedDate);
        if (entriesResult.success) {
          setDailyEntries((entriesResult.data as Record<string, unknown>[]) || []);
        }
      } else {
        alert(result.error || 'Failed to delete entry');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total hours for daily entries
  const totalDailySeconds = useMemo(() => {
    return dailyEntries.reduce((total, entry) => total + (entry.duration_seconds || 0), 0);
  }, [dailyEntries]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isManagerOrAbove) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Time Tracking</h1>
          <p className="text-muted-foreground">Track and manage your time entries</p>
        </div>
      </div>

      {/* Running Timer Widget */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timer
          </CardTitle>
        </CardHeader>
        <CardContent>
          {runningTimer ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-primary/5 p-4">
                <div className="flex-1">
                  <div className="text-3xl font-bold tabular-nums">
                    {formatDuration(elapsedSeconds)}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {runningTimer.project ? (
                      <span className="font-medium">
                        {Array.isArray(runningTimer.project)
                          ? runningTimer.project[0]?.name
                          : runningTimer.project?.name}
                      </span>
                    ) : (
                      'No project'
                    )}
                  </div>
                  {runningTimer.description && (
                    <div className="mt-1 text-sm">{runningTimer.description}</div>
                  )}
                </div>
                <Button
                  onClick={handleStopTimer}
                  disabled={loading}
                  variant="destructive"
                  size="lg"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop Timer
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Project (Optional)</label>
                  <Select
                    value={timerForm.projectId}
                    onValueChange={(val) => setTimerForm({ ...timerForm, projectId: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Description (Optional)</label>
                  <Input
                    placeholder="What are you working on?"
                    value={timerForm.description}
                    onChange={(e) => setTimerForm({ ...timerForm, description: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleStartTimer} disabled={loading} className="w-full">
                <Play className="mr-2 h-4 w-4" />
                Start Timer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Entry */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Manual Entry
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowManualEntry(!showManualEntry)}>
              {showManualEntry ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {showManualEntry && (
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Project (Optional)</label>
                  <Select
                    value={manualForm.projectId}
                    onValueChange={(val) => setManualForm({ ...manualForm, projectId: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Description</label>
                <Textarea
                  placeholder="What did you work on?"
                  value={manualForm.description}
                  onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Hours</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={manualForm.hours}
                    onChange={(e) => setManualForm({ ...manualForm, hours: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Minutes</label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="0"
                    value={manualForm.minutes}
                    onChange={(e) => setManualForm({ ...manualForm, minutes: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleManualEntry} disabled={loading} className="flex-1">
                  Add Entry
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setManualForm({ projectId: '', description: '', hours: '', minutes: '' });
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Time Log */}
      <Card>
        <CardHeader>
          <CardTitle>Time Log</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
            </TabsList>

            {/* Daily Tab */}
            <TabsContent value="daily" className="space-y-4">
              <div className="flex items-center justify-between">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-fit"
                />
                <div className="text-sm text-muted-foreground">
                  Total: <span className="font-bold">{formatHours(totalDailySeconds)}h</span>
                </div>
              </div>

              {dailyEntries.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No time entries for this date
                </div>
              ) : (
                <div className="space-y-2">
                  {dailyEntries.map((entry) => {
                    const project = Array.isArray(entry.project) ? entry.project[0] : entry.project;
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {entry.is_running ? (
                              <Badge variant="secondary" className="animate-pulse">
                                Running
                              </Badge>
                            ) : (
                              <div className="font-medium tabular-nums">
                                {formatHours(entry.duration_seconds || 0)}h
                              </div>
                            )}
                            {project && <Badge variant="outline">{project.name}</Badge>}
                          </div>
                          {entry.description && (
                            <div className="mt-1 text-sm text-muted-foreground">
                              {entry.description}
                            </div>
                          )}
                          <div className="mt-1 text-xs text-muted-foreground">
                            {format(new Date(entry.start_time), 'HH:mm')}
                            {entry.end_time && ` - ${format(new Date(entry.end_time), 'HH:mm')}`}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEntry(entry.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Weekly Tab */}
            <TabsContent value="weekly" className="space-y-4">
              <div className="flex items-center justify-between">
                <Input
                  type="date"
                  value={selectedWeekStart}
                  onChange={(e) => setSelectedWeekStart(e.target.value)}
                  className="w-fit"
                />
                <div className="text-sm text-muted-foreground">
                  Total:{' '}
                  <span className="font-bold">
                    {weeklySummary ? formatHours(weeklySummary.totalSeconds) : '0.00'}h
                  </span>
                </div>
              </div>

              {weeklySummary && (
                <div className="space-y-4">
                  {/* By Project */}
                  {Object.keys(weeklySummary.byProject as Record<string, unknown>).length > 0 && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium">Hours by Project</h4>
                      <div className="space-y-2">
                        {Object.entries(
                          weeklySummary.byProject as Record<
                            string,
                            { name: string; seconds: number }
                          >
                        ).map(([projectId, data]) => (
                          <div
                            key={projectId}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <span className="text-sm">{data.name}</span>
                            <span className="font-medium tabular-nums">
                              {formatHours(data.seconds)}h
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* By Date */}
                  {Object.keys(weeklySummary.byDate as Record<string, unknown>).length > 0 && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium">Hours by Day</h4>
                      <div className="space-y-2">
                        {Object.entries(weeklySummary.byDate as Record<string, number>).map(
                          ([date, seconds]) => (
                            <div
                              key={date}
                              className="flex items-center justify-between rounded-lg border p-3"
                            >
                              <span className="text-sm">
                                {format(new Date(date), 'EEE, MMM d')}
                              </span>
                              <span className="font-medium tabular-nums">
                                {formatHours(seconds)}h
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
