'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  TeachingNoteType,
  SkillCategory,
  Skill,
  UserSkill,
  Achievement,
  UserAchievement,
  TeachingNote,
  TaskReflection,
  ExtendedProfile,
} from '@/types/database';

export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

// =====================================================
// PROFILE & PREFERENCES
// =====================================================

export async function updateLearnMode(enabled: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ learn_mode: enabled })
    .eq('id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/settings');
  return { success: true };
}

export async function getExtendedProfile(userId?: string): Promise<ActionResult<ExtendedProfile>> {
  const supabase = await createClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }
    targetUserId = user.id;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', targetUserId)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as ExtendedProfile };
}

export async function completeOnboardingStep(step: number): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const updates: Record<string, unknown> = { onboarding_step: step };
  if (step >= 7) {
    updates.onboarding_completed = true;
  }

  const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// =====================================================
// SKILLS
// =====================================================

export async function getSkillCategories(): Promise<ActionResult<SkillCategory[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('skill_categories')
    .select('*')
    .order('display_order');

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as SkillCategory[] };
}

export async function getSkills(categoryId?: string): Promise<ActionResult<Skill[]>> {
  const supabase = await createClient();

  let query = supabase.from('skills').select('*, category:skill_categories(*)');

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query.order('name');

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Skill[] };
}

export async function getUserSkills(userId?: string): Promise<ActionResult<UserSkill[]>> {
  const supabase = await createClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }
    targetUserId = user.id;
  }

  const { data, error } = await supabase
    .from('user_skills')
    .select('*, skill:skills(*, category:skill_categories(*))')
    .eq('profile_id', targetUserId)
    .order('xp_earned', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as UserSkill[] };
}

export async function logSkillPractice(
  skillId: string,
  sourceType: 'phase_item' | 'issue' | 'project' | 'manual',
  sourceId?: string,
  xpEarned: number = 10
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Log the practice
  const { error: logError } = await supabase.from('skill_practice_log').insert({
    profile_id: user.id,
    skill_id: skillId,
    source_type: sourceType,
    source_id: sourceId,
    xp_earned: xpEarned,
  });

  if (logError) {
    return { success: false, error: logError.message };
  }

  // Upsert user skill (increment times_practiced and xp)
  const { data: existingSkill } = await supabase
    .from('user_skills')
    .select('*')
    .eq('profile_id', user.id)
    .eq('skill_id', skillId)
    .single();

  if (existingSkill) {
    const newTimesPracticed = (existingSkill.times_practiced || 0) + 1;
    const newXp = (existingSkill.xp_earned || 0) + xpEarned;
    const newLevel = Math.min(5, Math.floor(newXp / 100) + 1);

    await supabase
      .from('user_skills')
      .update({
        times_practiced: newTimesPracticed,
        xp_earned: newXp,
        proficiency_level: newLevel,
        last_practiced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingSkill.id);
  } else {
    await supabase.from('user_skills').insert({
      profile_id: user.id,
      skill_id: skillId,
      times_practiced: 1,
      xp_earned: xpEarned,
      proficiency_level: 1,
      last_practiced_at: new Date().toISOString(),
    });
  }

  // Update total XP in profile
  await supabase.rpc('increment_user_xp', { user_id: user.id, xp_amount: xpEarned });

  return { success: true };
}

// =====================================================
// ACHIEVEMENTS
// =====================================================

export async function getAchievements(): Promise<ActionResult<Achievement[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('is_active', true)
    .order('rarity');

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Achievement[] };
}

export async function getUserAchievements(
  userId?: string
): Promise<ActionResult<UserAchievement[]>> {
  const supabase = await createClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }
    targetUserId = user.id;
  }

  const { data, error } = await supabase
    .from('user_achievements')
    .select('*, achievement:achievements(*)')
    .eq('profile_id', targetUserId)
    .order('earned_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as UserAchievement[] };
}

export async function awardAchievement(achievementId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Check if already earned
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('id')
    .eq('profile_id', user.id)
    .eq('achievement_id', achievementId)
    .single();

  if (existing) {
    return { success: true, data: { alreadyEarned: true } };
  }

  // Get achievement for XP reward
  const { data: achievement } = await supabase
    .from('achievements')
    .select('xp_reward')
    .eq('id', achievementId)
    .single();

  // Award the achievement
  const { error } = await supabase.from('user_achievements').insert({
    profile_id: user.id,
    achievement_id: achievementId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Award XP
  if (achievement?.xp_reward) {
    await supabase
      .from('profiles')
      .update({
        total_xp: supabase.rpc('coalesce', [
          supabase.from('profiles').select('total_xp').eq('id', user.id),
          0,
        ]),
      })
      .eq('id', user.id);
  }

  return { success: true, data: { newAchievement: true } };
}

export async function markAchievementSeen(achievementId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('user_achievements')
    .update({ is_seen: true })
    .eq('profile_id', user.id)
    .eq('achievement_id', achievementId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// =====================================================
// TEACHING NOTES
// =====================================================

export async function getTeachingNotes(
  issueId?: string,
  phaseItemId?: string
): Promise<ActionResult<TeachingNote[]>> {
  const supabase = await createClient();

  let query = supabase.from('teaching_notes').select('*, mentor:profiles(*)');

  if (issueId) {
    query = query.eq('issue_id', issueId);
  }
  if (phaseItemId) {
    query = query.eq('phase_item_id', phaseItemId);
  }

  const { data, error } = await query.order('is_pinned', { ascending: false }).order('created_at');

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as TeachingNote[] };
}

export async function createTeachingNote(
  noteType: TeachingNoteType,
  content: string,
  issueId?: string,
  phaseItemId?: string,
  isPinned: boolean = false
): Promise<ActionResult<TeachingNote>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!issueId && !phaseItemId) {
    return { success: false, error: 'Must specify either issueId or phaseItemId' };
  }

  const { data, error } = await supabase
    .from('teaching_notes')
    .insert({
      mentor_id: user.id,
      note_type: noteType,
      content,
      issue_id: issueId,
      phase_item_id: phaseItemId,
      is_pinned: isPinned,
    })
    .select('*, mentor:profiles(*)')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  if (issueId) revalidatePath(`/projects`);
  return { success: true, data: data as TeachingNote };
}

export async function deleteTeachingNote(noteId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('teaching_notes')
    .delete()
    .eq('id', noteId)
    .eq('mentor_id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// =====================================================
// TASK REFLECTIONS
// =====================================================

export async function createTaskReflection(
  issueId: string | null,
  taskId: string | null,
  whatLearned: string,
  challengesFaced: string,
  timeSpentMinutes: number,
  difficultyRating: number
): Promise<ActionResult<TaskReflection>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { data, error } = await supabase
    .from('task_reflections')
    .insert({
      profile_id: user.id,
      issue_id: issueId,
      task_id: taskId,
      what_learned: whatLearned,
      challenges_faced: challengesFaced,
      time_spent_minutes: timeSpentMinutes,
      difficulty_rating: difficultyRating,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as TaskReflection };
}

// =====================================================
// REVIEW WORKFLOW
// =====================================================

export async function submitForReview(issueId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Get the mentor (admin user) to assign as reviewer
  const { data: mentor } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .single();

  const { error } = await supabase
    .from('issues')
    .update({
      requires_review: true,
      review_status: 'pending',
      reviewer_id: mentor?.id,
    })
    .eq('id', issueId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/inbox');
  revalidatePath('/projects');
  return { success: true };
}

export async function approveTask(issueId: string, notes?: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('issues')
    .update({
      review_status: 'approved',
      review_notes: notes,
      reviewed_at: new Date().toISOString(),
      status: 'Done',
    })
    .eq('id', issueId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/inbox');
  revalidatePath('/projects');
  return { success: true };
}

export async function requestRevision(issueId: string, notes: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('issues')
    .update({
      review_status: 'needs_revision',
      review_notes: notes,
      reviewed_at: new Date().toISOString(),
      status: 'In Progress',
    })
    .eq('id', issueId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/inbox');
  revalidatePath('/projects');
  return { success: true };
}

// =====================================================
// DELEGATE TO TRAINEE (Quick Action)
// =====================================================

export async function delegateToMoayad(issueId: string, context?: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Find Moayad's profile
  const { data: moayad } = await supabase
    .from('profiles')
    .select('id')
    .or('email.ilike.%moayad%,full_name.ilike.%moayad%')
    .single();

  if (!moayad) {
    return { success: false, error: 'Trainee profile not found' };
  }

  // Check if already assigned
  const { data: existing } = await supabase
    .from('issue_assignees')
    .select('id')
    .eq('issue_id', issueId)
    .eq('profile_id', moayad.id)
    .single();

  if (existing) {
    return { success: true, data: { alreadyAssigned: true } };
  }

  // Add assignee with mentor tracking
  const { error } = await supabase.from('issue_assignees').insert({
    issue_id: issueId,
    profile_id: moayad.id,
    assigned_by: user.id,
    assignment_type: 'mentor',
    assignment_context: context,
    mentor_id: user.id,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Set requires_review for mentor approval
  await supabase.from('issues').update({ requires_review: true }).eq('id', issueId);

  revalidatePath('/inbox');
  revalidatePath('/projects');
  return { success: true };
}

// =====================================================
// TODAY'S FOCUS
// =====================================================

export async function getTodaysFocus(): Promise<
  ActionResult<{
    topPriority: unknown;
    pendingReviews: unknown[];
    overdue: unknown[];
    dueToday: unknown[];
  }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Get issues assigned to user or created by user
  const { data: issues } = await supabase
    .from('issues')
    .select(
      `
      *,
      project:projects(name),
      assignees:issue_assignees(profile:profiles(full_name, avatar_url))
    `
    )
    .or(`creator_id.eq.${user.id}`)
    .in('status', ['Yet to Start', 'Todo', 'In Progress'])
    .order('priority')
    .limit(20);

  // Get pending reviews (for mentors)
  const { data: pendingReviews } = await supabase
    .from('issues')
    .select('*, assignees:issue_assignees(profile:profiles(full_name))')
    .eq('review_status', 'pending')
    .eq('reviewer_id', user.id);

  // AI prioritization: urgent first, then overdue, then due today
  const prioritized = (issues || []).sort((a, b) => {
    if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1;
    if (b.priority === 'Urgent' && a.priority !== 'Urgent') return 1;
    return 0;
  });

  return {
    success: true,
    data: {
      topPriority: prioritized[0] || null,
      pendingReviews: pendingReviews || [],
      overdue: [],
      dueToday: [],
    },
  };
}

// =====================================================
// SKILL GROWTH SUMMARY
// =====================================================

export async function getSkillGrowthSummary(userId?: string): Promise<
  ActionResult<{
    totalXp: number;
    currentStreak: number;
    skillsImproved: number;
    topSkillThisWeek: string | null;
    recentAchievements: UserAchievement[];
  }>
> {
  const supabase = await createClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }
    targetUserId = user.id;
  }

  // Get profile for XP and streak
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_xp, current_streak')
    .eq('id', targetUserId)
    .single();

  // Get practice logs from this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: recentPractice } = await supabase
    .from('skill_practice_log')
    .select('skill_id, skill:skills(name)')
    .eq('profile_id', targetUserId)
    .gte('practiced_at', weekAgo.toISOString());

  // Count unique skills practiced
  const uniqueSkills = new Set(recentPractice?.map((p) => p.skill_id) || []);

  // Find most practiced skill
  const skillCounts: Record<string, { count: number; name: string }> = {};
  recentPractice?.forEach((p) => {
    const skillName = (p.skill as unknown as { name: string })?.name || 'Unknown';
    if (!skillCounts[p.skill_id]) {
      skillCounts[p.skill_id] = { count: 0, name: skillName };
    }
    skillCounts[p.skill_id].count++;
  });

  const topSkill = Object.entries(skillCounts).sort((a, b) => b[1].count - a[1].count)[0];

  // Get recent achievements
  const { data: achievements } = await supabase
    .from('user_achievements')
    .select('*, achievement:achievements(*)')
    .eq('profile_id', targetUserId)
    .order('earned_at', { ascending: false })
    .limit(3);

  return {
    success: true,
    data: {
      totalXp: profile?.total_xp || 0,
      currentStreak: profile?.current_streak || 0,
      skillsImproved: uniqueSkills.size,
      topSkillThisWeek: topSkill?.[1]?.name || null,
      recentAchievements: (achievements || []) as UserAchievement[],
    },
  };
}
