'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  TrendingUp,
  Target,
  Zap,
  Calendar,
  CheckCircle2,
  Flame,
  Award
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

interface DailyInsights {
  greeting: string;
  motivation: string;
  quickWins: QuickWin[];
  streak: number;
  todaysFocus: string;
  completedYesterday: number;
  productivity: number;
  achievements: Achievement[];
}

interface QuickWin {
  id: string;
  title: string;
  points: number;
  estimatedTime: string;
  impact: 'low' | 'medium' | 'high';
}

interface Achievement {
  id: string;
  title: string;
  icon: string;
  unlockedAt?: Date;
}

export function DailyStandup() {
  const [insights, setInsights] = useState<DailyInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWin, setSelectedWin] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadDailyInsights();
  }, []);

  const loadDailyInsights = async () => {
    try {
      // Get user data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate greeting based on time
      const hour = new Date().getHours();
      const greeting = getTimeBasedGreeting(hour, user.user_metadata?.name || 'there');

      // Get yesterday's completed tasks
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: completedTasks } = await supabase
        .from('issues')
        .select('id')
        .eq('status', 'completed')
        .gte('updated_at', yesterday.toISOString().split('T')[0])
        .lte('updated_at', new Date().toISOString().split('T')[0]);

      // Get streak data
      const streak = await calculateStreak(user.id);

      // Get today's suggested tasks
      const { data: suggestions } = await supabase
        .from('issues')
        .select('*')
        .eq('status', 'in_progress')
        .order('priority', { ascending: false })
        .limit(3);

      // Generate motivational quote
      const motivation = await generateMotivation(completedTasks?.length || 0, streak);

      // Transform suggestions to quick wins
      const quickWins: QuickWin[] = (suggestions || []).map(task => ({
        id: task.id,
        title: task.title,
        points: calculatePoints(task.priority),
        estimatedTime: '15-30 min',
        impact: task.priority === 'urgent' ? 'high' : task.priority === 'high' ? 'medium' : 'low'
      }));

      setInsights({
        greeting,
        motivation,
        quickWins,
        streak,
        todaysFocus: determineFocus(suggestions),
        completedYesterday: completedTasks?.length || 0,
        productivity: calculateProductivity(completedTasks?.length || 0),
        achievements: await checkAchievements(user.id)
      });
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeBasedGreeting = (hour: number, name: string): string => {
    if (hour < 5) return `🌙 Burning the midnight oil, ${name}?`;
    if (hour < 12) return `☀️ Good morning, ${name}!`;
    if (hour < 17) return `👋 Good afternoon, ${name}!`;
    if (hour < 21) return `🌅 Good evening, ${name}!`;
    return `🌃 Working late, ${name}?`;
  };

  const calculateStreak = async (userId: string): Promise<number> => {
    // This would check consecutive days with activity
    // For now, returning a mock value
    return Math.floor(Math.random() * 30) + 1;
  };

  const generateMotivation = async (completedCount: number, streak: number): Promise<string> => {
    const motivations = [
      `You're on a ${streak}-day streak! Keep the momentum going! 🚀`,
      `Yesterday's ${completedCount} completions show you're crushing it! 💪`,
      `Every small step forward is progress. You've got this! ⭐`,
      `Your consistency is paying off. ${streak} days of awesome! 🎯`,
      `Focus on progress, not perfection. You're doing great! 🌟`
    ];
    return motivations[Math.floor(Math.random() * motivations.length)];
  };

  const calculatePoints = (priority: string): number => {
    const points = { urgent: 50, high: 30, medium: 20, low: 10 };
    return points[priority as keyof typeof points] || 10;
  };

  const determineFocus = (tasks: any[]): string => {
    if (!tasks || tasks.length === 0) return 'Starting fresh today!';
    const priorities = tasks.map(t => t.priority);
    if (priorities.includes('urgent')) return '🔴 Urgent tasks need attention';
    if (priorities.includes('high')) return '🟡 High-priority items to tackle';
    return '🟢 Steady progress on current tasks';
  };

  const calculateProductivity = (completed: number): number => {
    return Math.min(100, completed * 20);
  };

  const checkAchievements = async (userId: string): Promise<Achievement[]> => {
    // Mock achievements for now
    return [
      { id: '1', title: 'Early Bird', icon: '🌅' },
      { id: '2', title: 'Task Master', icon: '🎯' },
      { id: '3', title: 'Streak Champion', icon: '🔥' }
    ];
  };

  const completeQuickWin = async (winId: string) => {
    setSelectedWin(winId);
    // Mark task as completed
    await supabase
      .from('issues')
      .update({ status: 'completed' })
      .eq('id', winId);

    // Reload insights
    loadDailyInsights();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <Sparkles className="h-8 w-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="space-y-6">
      {/* Header with Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-lg bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-8 text-white"
      >
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2">{insights.greeting}</h1>
          <p className="text-xl opacity-90">{insights.motivation}</p>
        </div>

        {/* Animated background elements */}
        <motion.div
          className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white opacity-10"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0]
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Streak</p>
              <div className="flex items-center gap-2 mt-1">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="text-2xl font-bold">{insights.streak}</span>
              </div>
            </div>
            <div className="text-4xl">🔥</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Yesterday</p>
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">{insights.completedYesterday}</span>
              </div>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Productivity</p>
              <div className="mt-2">
                <Progress value={insights.productivity} className="h-2" />
                <span className="text-sm font-medium">{insights.productivity}%</span>
              </div>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Today's Focus</p>
              <p className="text-sm font-medium mt-1">{insights.todaysFocus}</p>
            </div>
            <Target className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Quick Wins */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <h2 className="text-xl font-semibold">Quick Wins for Today</h2>
          </div>
          <Badge variant="secondary">Earn XP</Badge>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {insights.quickWins.map((win, index) => (
              <motion.div
                key={win.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{win.title}</h3>
                    <Badge
                      variant={win.impact === 'high' ? 'destructive' : win.impact === 'medium' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {win.impact}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span>⏱️ {win.estimatedTime}</span>
                    <span>⚡ {win.points} XP</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={selectedWin === win.id ? 'default' : 'outline'}
                  onClick={() => completeQuickWin(win.id)}
                  disabled={selectedWin === win.id}
                >
                  {selectedWin === win.id ? '✓ Done' : 'Complete'}
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Card>

      {/* Achievements */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Award className="h-5 w-5 text-yellow-500" />
          <h2 className="text-xl font-semibold">Recent Achievements</h2>
        </div>

        <div className="flex gap-4">
          {insights.achievements.map((achievement) => (
            <motion.div
              key={achievement.id}
              whileHover={{ scale: 1.1 }}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card"
            >
              <div className="text-3xl">{achievement.icon}</div>
              <span className="text-sm font-medium">{achievement.title}</span>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}