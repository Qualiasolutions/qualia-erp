'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Heart,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Trophy,
  Star,
  Shield,
  Zap,
  Target,
  Award,
  GitCommit,
  Users,
  Calendar
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface ProjectHealth {
  id: string;
  name: string;
  score: number;
  level: number;
  xp: number;
  nextLevelXp: number;
  status: 'healthy' | 'warning' | 'critical';
  metrics: {
    taskCompletion: number;
    deadlineAdherence: number;
    teamActivity: number;
    commitFrequency: number;
  };
  achievements: Achievement[];
  recentActivity: Activity[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  unlockedAt?: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface Activity {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  points: number;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_task',
    name: 'First Steps',
    description: 'Complete your first task',
    icon: <Star className="h-4 w-4" />,
    rarity: 'common'
  },
  {
    id: 'week_streak',
    name: 'Consistent',
    description: '7-day activity streak',
    icon: <Trophy className="h-4 w-4" />,
    rarity: 'rare'
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: 'Complete all tasks on time for a week',
    icon: <Shield className="h-4 w-4" />,
    rarity: 'epic'
  },
  {
    id: 'milestone_master',
    name: 'Milestone Master',
    description: 'Complete 10 project milestones',
    icon: <Target className="h-4 w-4" />,
    rarity: 'legendary'
  }
];

export function ProjectHealthMonitor({ projectId }: { projectId?: string }) {
  const [projects, setProjects] = useState<ProjectHealth[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [animatingXp, setAnimatingXp] = useState<{ [key: string]: number }>({});
  const supabase = createClient();

  useEffect(() => {
    loadProjectHealth();
    subscribeToUpdates();
  }, [projectId]);

  const loadProjectHealth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get projects
      const query = supabase.from('projects').select('*');
      if (projectId) query.eq('id', projectId);

      const { data: projectsData } = await query;
      if (!projectsData) return;

      // Calculate health for each project
      const healthData = await Promise.all(
        projectsData.map(async (project) => {
          const health = await calculateProjectHealth(project);
          return health;
        })
      );

      setProjects(healthData);
      if (projectId && healthData.length > 0) {
        setSelectedProject(healthData[0].id);
      }
    } catch (error) {
      console.error('Error loading project health:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProjectHealth = async (project: any): Promise<ProjectHealth> => {
    const supabase = createClient();

    // Get metrics data
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Task completion rate
    const { data: tasks } = await supabase
      .from('issues')
      .select('status')
      .eq('project_id', project.id)
      .gte('created_at', weekAgo.toISOString());

    const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
    const totalTasks = tasks?.length || 1;
    const taskCompletion = (completedTasks / totalTasks) * 100;

    // Deadline adherence (mock for now)
    const deadlineAdherence = 75 + Math.random() * 25;

    // Team activity
    const { data: activities } = await supabase
      .from('activities')
      .select('id')
      .eq('project_id', project.id)
      .gte('created_at', weekAgo.toISOString());

    const teamActivity = Math.min(100, (activities?.length || 0) * 10);

    // Commit frequency (mock for now)
    const commitFrequency = 60 + Math.random() * 40;

    // Calculate overall score
    const score = Math.round(
      (taskCompletion * 0.3) +
      (deadlineAdherence * 0.3) +
      (teamActivity * 0.2) +
      (commitFrequency * 0.2)
    );

    // Calculate XP and level
    const totalXp = completedTasks * 100 + activities?.length * 10;
    const level = Math.floor(totalXp / 1000) + 1;
    const xpInCurrentLevel = totalXp % 1000;
    const nextLevelXp = 1000;

    // Determine status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (score < 50) status = 'critical';
    else if (score < 75) status = 'warning';

    // Get recent activity
    const { data: recentActivities } = await supabase
      .from('activities')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const activities: Activity[] = (recentActivities || []).map(a => ({
      id: a.id,
      type: a.type,
      message: a.description || '',
      timestamp: new Date(a.created_at),
      points: 10
    }));

    // Check achievements
    const achievements = checkAchievements(completedTasks, activities.length, level);

    return {
      id: project.id,
      name: project.name,
      score,
      level,
      xp: xpInCurrentLevel,
      nextLevelXp,
      status,
      metrics: {
        taskCompletion: Math.round(taskCompletion),
        deadlineAdherence: Math.round(deadlineAdherence),
        teamActivity: Math.round(teamActivity),
        commitFrequency: Math.round(commitFrequency)
      },
      achievements,
      recentActivity: activities
    };
  };

  const checkAchievements = (tasks: number, activities: number, level: number): Achievement[] => {
    const unlocked: Achievement[] = [];

    if (tasks > 0) {
      const firstTask = ACHIEVEMENTS.find(a => a.id === 'first_task');
      if (firstTask) {
        unlocked.push({ ...firstTask, unlockedAt: new Date() });
      }
    }

    if (activities >= 7) {
      const weekStreak = ACHIEVEMENTS.find(a => a.id === 'week_streak');
      if (weekStreak) {
        unlocked.push({ ...weekStreak, unlockedAt: new Date() });
      }
    }

    if (level >= 5) {
      const perfectWeek = ACHIEVEMENTS.find(a => a.id === 'perfect_week');
      if (perfectWeek) {
        unlocked.push({ ...perfectWeek, unlockedAt: new Date() });
      }
    }

    return unlocked;
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel('project-health')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issues'
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new.status === 'completed') {
            animateXpGain(payload.new.project_id, 100);
          }
          loadProjectHealth();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const animateXpGain = (projectId: string, xp: number) => {
    setAnimatingXp(prev => ({ ...prev, [projectId]: xp }));
    setTimeout(() => {
      setAnimatingXp(prev => {
        const next = { ...prev };
        delete next[projectId];
        return next;
      });
    }, 2000);
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Heart className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <Activity className="h-5 w-5 text-red-500" />;
      default:
        return <Heart className="h-5 w-5" />;
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'bg-gray-500';
      case 'rare':
        return 'bg-blue-500';
      case 'epic':
        return 'bg-purple-500';
      case 'legendary':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <Heart className="h-8 w-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Card
            key={project.id}
            className={cn(
              'p-6 cursor-pointer transition-all hover:shadow-lg',
              selectedProject === project.id && 'ring-2 ring-primary'
            )}
            onClick={() => setSelectedProject(project.id)}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {getHealthIcon(project.status)}
                <h3 className="font-semibold">{project.name}</h3>
              </div>
              <Badge variant="outline">Lvl {project.level}</Badge>
            </div>

            {/* Health Score */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Health Score</span>
                <span className="text-2xl font-bold">{project.score}%</span>
              </div>
              <div className="relative h-4 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className={cn('h-full', getHealthColor(project.score))}
                  initial={{ width: 0 }}
                  animate={{ width: `${project.score}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* XP Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">XP Progress</span>
                <span className="text-xs font-medium">
                  {project.xp} / {project.nextLevelXp} XP
                </span>
              </div>
              <Progress
                value={(project.xp / project.nextLevelXp) * 100}
                className="h-2"
              />
            </div>

            {/* XP Animation */}
            <AnimatePresence>
              {animatingXp[project.id] && (
                <motion.div
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: 1, y: -20 }}
                  exit={{ opacity: 0, y: -40 }}
                  className="absolute top-4 right-4 text-green-500 font-bold"
                >
                  +{animatingXp[project.id]} XP
                </motion.div>
              )}
            </AnimatePresence>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3 text-muted-foreground" />
                <span>Tasks: {project.metrics.taskCompletion}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span>Deadlines: {project.metrics.deadlineAdherence}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span>Activity: {project.metrics.teamActivity}%</span>
              </div>
              <div className="flex items-center gap-1">
                <GitCommit className="h-3 w-3 text-muted-foreground" />
                <span>Commits: {project.metrics.commitFrequency}%</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Detailed View for Selected Project */}
      {selectedProject && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {(() => {
            const project = projects.find(p => p.id === selectedProject);
            if (!project) return null;

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Achievements */}
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <h3 className="text-lg font-semibold">Achievements</h3>
                  </div>
                  <div className="space-y-3">
                    {project.achievements.map((achievement) => (
                      <motion.div
                        key={achievement.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                      >
                        <div
                          className={cn(
                            'p-2 rounded-full',
                            getRarityColor(achievement.rarity),
                            'bg-opacity-20'
                          )}
                        >
                          {achievement.icon}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{achievement.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {achievement.description}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            getRarityColor(achievement.rarity),
                            'bg-opacity-10'
                          )}
                        >
                          {achievement.rarity}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </Card>

                {/* Recent Activity */}
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="h-5 w-5 text-blue-500" />
                    <h3 className="text-lg font-semibold">Recent Activity</h3>
                  </div>
                  <div className="space-y-2">
                    {project.recentActivity.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="text-sm">{activity.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-green-500">
                          +{activity.points} XP
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              </div>
            );
          })()}
        </motion.div>
      )}
    </div>
  );
}