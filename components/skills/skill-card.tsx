'use client';

import { Zap, Star, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PROFICIENCY_LEVEL_COLORS } from '@/lib/color-constants';
import type { Skill, UserSkill, ProficiencyLevel } from '@/types/database';

interface SkillCardProps {
  skill: Skill;
  userSkill?: UserSkill;
  compact?: boolean;
  onClick?: () => void;
}

export function SkillCard({ skill, userSkill, compact = false, onClick }: SkillCardProps) {
  const level = (userSkill?.proficiency_level || 1) as ProficiencyLevel;
  const levelConfig = PROFICIENCY_LEVEL_COLORS[level];
  const xp = userSkill?.xp_earned || 0;
  const timesPracticed = userSkill?.times_practiced || 0;

  // XP needed for next level (exponential growth)
  const xpForNextLevel = level < 5 ? Math.pow(level + 1, 2) * 100 : null;
  const progressToNext = xpForNextLevel ? Math.min((xp / xpForNextLevel) * 100, 100) : 100;

  if (compact) {
    return (
      <div
        className={cn(
          'flex cursor-pointer items-center gap-2 rounded-lg bg-muted/30 p-2 transition-colors hover:bg-muted/50',
          onClick && 'cursor-pointer'
        )}
        onClick={onClick}
      >
        <div className={cn('h-2 w-2 rounded-full', levelConfig.dot)} />
        <span className="flex-1 truncate text-sm font-medium">{skill.name}</span>
        <Badge variant="secondary" className="h-5 text-[10px]">
          {levelConfig.label}
        </Badge>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'border-border/60 transition-all hover:border-qualia-500/40',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h4 className="text-sm font-medium">{skill.name}</h4>
            {skill.description && (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {skill.description}
              </p>
            )}
          </div>
          <Badge className={cn(levelConfig.bg, levelConfig.text, 'border', levelConfig.border)}>
            {levelConfig.label}
          </Badge>
        </div>

        {/* Progress to next level */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Zap className="h-3 w-3" />
              {xp} XP
            </span>
            {xpForNextLevel && (
              <span className="text-muted-foreground">
                {xpForNextLevel - xp} to Level {level + 1}
              </span>
            )}
          </div>
          <Progress value={progressToNext} className="h-1.5" />
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            Level {level}/5
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {timesPracticed} practices
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

interface SkillListProps {
  skills: Skill[];
  userSkills: UserSkill[];
  compact?: boolean;
}

export function SkillList({ skills, userSkills, compact = false }: SkillListProps) {
  const skillMap = new Map(userSkills.map((us) => [us.skill_id, us]));

  return (
    <div className={cn(compact ? 'space-y-1' : 'grid gap-3 sm:grid-cols-2')}>
      {skills.map((skill) => (
        <SkillCard
          key={skill.id}
          skill={skill}
          userSkill={skillMap.get(skill.id)}
          compact={compact}
        />
      ))}
    </div>
  );
}
