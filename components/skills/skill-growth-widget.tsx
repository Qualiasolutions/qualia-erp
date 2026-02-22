'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Award, Flame, Target, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getSkillGrowthSummary } from '@/app/actions/learning';
import { ACHIEVEMENT_RARITY_COLORS } from '@/lib/color-constants';
import { cn } from '@/lib/utils';

interface SkillGrowthWidgetProps {
  profileId?: string;
}

export function SkillGrowthWidget({ profileId }: SkillGrowthWidgetProps) {
  const [data, setData] = useState<{
    totalXp: number;
    currentStreak: number;
    skillsImproved: number;
    topSkillThisWeek: string | null;
    recentAchievements: Array<{
      achievement?: { name: string; icon: string; rarity: string };
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await getSkillGrowthSummary(profileId);
      if (result.success && result.data) {
        setData(result.data);
      }
      setLoading(false);
    }
    load();
  }, [profileId]);

  if (loading) {
    return (
      <Card className="border-qualia-500/30">
        <CardContent className="flex h-48 items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const level = Math.floor(data.totalXp / 500) + 1;
  const xpInCurrentLevel = data.totalXp % 500;
  const levelProgress = (xpInCurrentLevel / 500) * 100;

  return (
    <Card className="h-full border-qualia-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <TrendingUp className="h-4 w-4 text-qualia-500" />
          Your Growth
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/30 p-2 text-center">
            <div className="text-xl font-bold text-qualia-400">{data.totalXp}</div>
            <div className="text-[11px] text-muted-foreground">Total XP</div>
          </div>
          <div className="rounded-lg bg-muted/30 p-2 text-center">
            <div className="text-xl font-bold text-purple-400">Lvl {level}</div>
            <div className="text-[11px] text-muted-foreground">Level</div>
          </div>
          <div className="relative rounded-lg bg-muted/30 p-2 text-center">
            {data.currentStreak > 0 && (
              <Flame className="absolute right-1 top-1 h-3 w-3 text-orange-400" />
            )}
            <div className="text-xl font-bold text-orange-400">{data.currentStreak}</div>
            <div className="text-[11px] text-muted-foreground">Day Streak</div>
          </div>
        </div>

        {/* Level Progress */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Level {level}</span>
            <span className="text-muted-foreground">{500 - xpInCurrentLevel} XP to next</span>
          </div>
          <Progress value={levelProgress} className="h-1.5" />
        </div>

        {/* Top Skill This Week */}
        {data.topSkillThisWeek && (
          <div className="rounded-lg border border-qualia-500/20 bg-qualia-500/10 p-2.5">
            <div className="mb-0.5 text-[11px] text-muted-foreground">Most practiced</div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-qualia-400">
              <Sparkles className="h-3.5 w-3.5" />
              {data.topSkillThisWeek}
            </div>
          </div>
        )}

        {/* Skills Improved */}
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Target className="h-3.5 w-3.5" />
            Skills practiced this week
          </span>
          <Badge variant="secondary">{data.skillsImproved}</Badge>
        </div>

        {/* Recent Achievements */}
        {data.recentAchievements.length > 0 && (
          <div className="border-t border-border/60 pt-2">
            <div className="mb-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Award className="h-3 w-3" />
              Recent Achievements
            </div>
            <div className="flex gap-2">
              {data.recentAchievements.slice(0, 3).map((ua, i) => {
                if (!ua.achievement) return null;
                const rarity = ua.achievement.rarity as keyof typeof ACHIEVEMENT_RARITY_COLORS;
                const colors =
                  ACHIEVEMENT_RARITY_COLORS[rarity] || ACHIEVEMENT_RARITY_COLORS.common;
                return (
                  <div
                    key={i}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full text-lg',
                      colors.bg,
                      colors.border,
                      colors.glow,
                      'border'
                    )}
                    title={ua.achievement.name}
                  >
                    {ua.achievement.icon}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
