'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Sparkles, GraduationCap, Flame, Zap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { getExtendedProfile, updateLearnMode } from '@/app/actions/learning';
import type { ExtendedProfile } from '@/types/database';

export function LearnModeSettings() {
  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    async function load() {
      const result = await getExtendedProfile();
      if (result.success && result.data) {
        setProfile(result.data);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleToggle = async (enabled: boolean) => {
    setToggling(true);
    await updateLearnMode(enabled);
    setProfile((prev) => (prev ? { ...prev, learn_mode: enabled } : null));
    setToggling(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-10 w-full rounded bg-muted" />
      </div>
    );
  }

  if (!profile) {
    return <p className="text-sm text-muted-foreground">Unable to load learning settings.</p>;
  }

  const level = Math.floor((profile.total_xp || 0) / 500) + 1;
  const xpInLevel = (profile.total_xp || 0) % 500;
  const levelProgress = (xpInLevel / 500) * 100;

  return (
    <div className="space-y-6">
      {/* Learn Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'rounded-lg p-2',
              profile.learn_mode
                ? 'bg-qualia-500/10 text-qualia-400'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">Learn Mode</p>
            <p className="text-sm text-muted-foreground">
              Show learning tips, skill tracking, and mentor guidance
            </p>
          </div>
        </div>
        <Switch
          checked={profile.learn_mode || false}
          onCheckedChange={handleToggle}
          disabled={toggling}
        />
      </div>

      {/* Learning Stats (shown when learn mode is on) */}
      {profile.learn_mode && (
        <div className="space-y-4 border-t border-border/60 pt-4">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Your Learning Journey
          </h3>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-lg font-bold text-qualia-400">
                <Zap className="h-4 w-4" />
                {profile.total_xp || 0}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">Total XP</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <div className="text-lg font-bold text-purple-400">Lvl {level}</div>
              <p className="mt-1 text-[10px] text-muted-foreground">Current Level</p>
            </div>
            <div className="relative rounded-lg bg-muted/30 p-3 text-center">
              {(profile.current_streak || 0) > 0 && (
                <Flame className="absolute right-1 top-1 h-3 w-3 text-orange-400" />
              )}
              <div className="text-lg font-bold text-orange-400">{profile.current_streak || 0}</div>
              <p className="mt-1 text-[10px] text-muted-foreground">Day Streak</p>
            </div>
          </div>

          {/* Level Progress */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Level {level} Progress</span>
              <span>
                {500 - xpInLevel} XP to Level {level + 1}
              </span>
            </div>
            <Progress value={levelProgress} className="h-2" />
          </div>

          {/* Quick Links */}
          <div className="flex gap-2 pt-2">
            <a
              href="/skills"
              className="flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-400 transition-colors hover:bg-purple-500/20"
            >
              <BookOpen className="h-3 w-3" />
              View All Skills
            </a>
          </div>
        </div>
      )}

      {/* Trainee Badge */}
      {profile.is_trainee && (
        <div className="flex items-center gap-2 border-t border-border/60 pt-4">
          <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">
            <GraduationCap className="mr-1 h-3 w-3" />
            Trainee Account
          </Badge>
          <span className="text-xs text-muted-foreground">
            Your mentor can assign tasks and provide guidance
          </span>
        </div>
      )}
    </div>
  );
}
