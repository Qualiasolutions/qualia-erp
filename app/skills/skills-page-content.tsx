'use client';

import { useEffect, useState } from 'react';
import { Trophy, Sparkles, Award, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SkillGrowthWidget } from '@/components/skills/skill-growth-widget';
import { SkillCard } from '@/components/skills/skill-card';
import { getSkills, getUserSkills, getUserAchievements } from '@/app/actions/learning';
import { ACHIEVEMENT_RARITY_COLORS } from '@/lib/color-constants';
import { cn } from '@/lib/utils';
import type { Skill, UserSkill, UserAchievement } from '@/types/database';

export function SkillsPageContent() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [skillsRes, userSkillsRes, achievementsRes] = await Promise.all([
        getSkills(),
        getUserSkills(),
        getUserAchievements(),
      ]);

      if (skillsRes.success && skillsRes.data) {
        setSkills(skillsRes.data);
      }
      if (userSkillsRes.success && userSkillsRes.data) {
        setUserSkills(userSkillsRes.data);
      }
      if (achievementsRes.success && achievementsRes.data) {
        setAchievements(achievementsRes.data);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading skills...</p>
        </div>
      </div>
    );
  }

  // Create a map for quick user skill lookup
  const userSkillMap = new Map(userSkills.map((us) => [us.skill_id, us]));

  // Group skills by category
  const skillsByCategory = skills.reduce(
    (acc, skill) => {
      const categoryName =
        (skill as Skill & { category?: { name: string } }).category?.name || 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(skill);
      return acc;
    },
    {} as Record<string, Skill[]>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border/30 bg-card/80 px-6 py-6 backdrop-blur-xl lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 ring-1 ring-border/50">
              <Trophy className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Skills & Growth</h1>
              <p className="text-sm text-muted-foreground">
                Track your progress and unlock achievements
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Top Row: Growth Widget + Quick Stats */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Skill Growth Widget */}
            <div className="lg:col-span-1">
              <SkillGrowthWidget />
            </div>

            {/* Quick Stats */}
            <div className="space-y-4 lg:col-span-2">
              <Card className="border-border/30 bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground">
                    <Target className="h-4 w-4 text-qualia-500" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-lg bg-muted/50 p-4 text-center">
                      <div className="text-2xl font-bold text-foreground">{skills.length}</div>
                      <div className="text-xs text-muted-foreground">Available Skills</div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4 text-center">
                      <div className="text-2xl font-bold text-qualia-400">{userSkills.length}</div>
                      <div className="text-xs text-muted-foreground">Skills Practiced</div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4 text-center">
                      <div className="text-2xl font-bold text-amber-400">{achievements.length}</div>
                      <div className="text-xs text-muted-foreground">Achievements</div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4 text-center">
                      <div className="text-2xl font-bold text-emerald-400">
                        {userSkills.filter((us) => us.proficiency_level >= 4).length}
                      </div>
                      <div className="text-xs text-muted-foreground">Mastered</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Achievements Section */}
          {achievements.length > 0 && (
            <Card className="border-border/30 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground">
                  <Award className="h-4 w-4 text-amber-500" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {achievements.map((ua) => {
                    const achievement = (
                      ua as UserAchievement & {
                        achievement?: {
                          name: string;
                          description: string;
                          icon: string;
                          rarity: string;
                          xp_reward: number;
                        };
                      }
                    ).achievement;
                    if (!achievement) return null;
                    const rarity = achievement.rarity as keyof typeof ACHIEVEMENT_RARITY_COLORS;
                    const colors =
                      ACHIEVEMENT_RARITY_COLORS[rarity] || ACHIEVEMENT_RARITY_COLORS.common;

                    return (
                      <div
                        key={ua.id}
                        className={cn(
                          'flex items-center gap-3 rounded-lg border p-3',
                          colors.bg,
                          colors.border
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl',
                            colors.bg,
                            colors.glow
                          )}
                        >
                          {achievement.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {achievement.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {achievement.description}
                          </p>
                          <Badge variant="secondary" className="mt-1 text-[11px]">
                            +{achievement.xp_reward} XP
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Skills by Category */}
          <div className="space-y-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <TrendingUp className="h-5 w-5 text-qualia-500" />
              Skills Library
            </h2>

            {Object.entries(skillsByCategory).length === 0 ? (
              <Card className="border-border/30 bg-card">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Sparkles className="mb-3 h-12 w-12 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">No skills available yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Skills will appear here as you complete tasks
                  </p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(skillsByCategory).map(([category, categorySkills]) => (
                <Card key={category} className="border-border/30 bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {categorySkills.map((skill) => (
                        <SkillCard
                          key={skill.id}
                          skill={skill}
                          userSkill={userSkillMap.get(skill.id)}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Empty State for No User Progress */}
          {userSkills.length === 0 && skills.length > 0 && (
            <Card className="border-dashed border-border bg-muted/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Trophy className="mb-3 h-12 w-12 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Start your journey</p>
                <p className="mt-1 max-w-sm text-center text-xs text-muted-foreground">
                  Complete tasks to earn XP and level up your skills. Each completed task helps you
                  grow!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
