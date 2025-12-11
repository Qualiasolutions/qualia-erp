import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { DashboardClient } from '@/components/dashboard-client';
import { getCurrentUserProfile } from './actions';

// Helper function to get user's upcoming meetings and tasks
async function getUserDashboardData(userId: string, workspaceId?: string) {
  const supabase = await createClient();

  // Get today and tomorrow dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const endOfTomorrow = new Date(tomorrow);
  endOfTomorrow.setHours(23, 59, 59, 999);

  // Get upcoming meetings for today and tomorrow
  const { data: meetings } = await supabase
    .from('meetings')
    .select(
      `
      id,
      title,
      description,
      start_time,
      end_time,
      project:projects(id, name),
      client:clients(id, display_name)
    `
    )
    .gte('start_time', today.toISOString())
    .lte('start_time', endOfTomorrow.toISOString())
    .eq('workspace_id', workspaceId)
    .order('start_time', { ascending: true })
    .limit(5);

  // Get high priority incomplete tasks
  const { data: highPriorityTasks } = await supabase
    .from('issues')
    .select('id, title, priority, status, due_date')
    .eq('workspace_id', workspaceId)
    .in('priority', ['high', 'critical'])
    .in('status', ['backlog', 'todo', 'in_progress'])
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(5);

  // Get tasks assigned to the user that are overdue or due today
  const { data: assignedIssues } = await supabase
    .from('issue_assignees')
    .select(
      `
      issue:issues(
        id,
        title,
        priority,
        status,
        due_date
      )
    `
    )
    .eq('assignee_id', userId)
    .lte('issues.due_date', tomorrow.toISOString())
    .in('issues.status', ['backlog', 'todo', 'in_progress'])
    .limit(5);

  // Extract the issues from the join result
  const userTasks = assignedIssues?.map((item) => item.issue).filter(Boolean) || [];

  // Type assertions for better TypeScript support
  interface TaskType {
    id: string;
    title: string;
    priority: string;
    status: string;
    due_date: string | null;
  }

  const typedUserTasks = userTasks.map((task: TaskType) => ({
    id: task.id,
    title: task.title,
    priority: task.priority,
    status: task.status,
    due_date: task.due_date,
  }));

  // Get recently completed tasks (for motivation)
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const { count } = await supabase
    .from('issues')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('status', 'done')
    .gte('updated_at', lastWeek.toISOString());

  // Get team members' birthdays or important dates (if available)
  // For now, we'll use a hardcoded approach for demo
  const importantDates = getImportantDates();

  return {
    meetings: meetings || [],
    highPriorityTasks: highPriorityTasks || [],
    userTasks: typedUserTasks,
    completedTasksCount: count || 0,
    importantDates,
  };
}

// Helper function for special dates and occasions
function getImportantDates() {
  const today = new Date();
  const dates = [];

  // Check if it's a special day
  const month = today.getMonth() + 1;
  const day = today.getDate();

  // Ramadan/Eid (approximate - would need a proper Islamic calendar library)
  if (month === 3 && day >= 10 && day <= 30) {
    dates.push({ type: 'ramadan', message: 'رمضان كريم' });
  }

  // Friday (special day in Islamic culture)
  if (today.getDay() === 5) {
    dates.push({ type: 'friday', message: 'جمعة مباركة' });
  }

  // Beginning of month (good for monthly planning)
  if (day === 1) {
    dates.push({ type: 'month_start', message: 'بداية شهر جديد' });
  }

  return dates;
}

// Generate personalized greeting data
function generatePersonalizedGreeting(
  userName: string,
  dashboardData: Awaited<ReturnType<typeof getUserDashboardData>>
) {
  const firstName = userName?.split(' ')[0] || '';
  const isFawzi = firstName.toLowerCase() === 'fawzi';
  const isMoayad = firstName.toLowerCase() === 'moayad';

  // Count urgent items
  const todayMeetingsCount = dashboardData.meetings.filter((m) => {
    const meetingDate = new Date(m.start_time);
    const today = new Date();
    return meetingDate.toDateString() === today.toDateString();
  }).length;

  const urgentTasksCount = dashboardData.highPriorityTasks.length;
  const overdueTasksCount = dashboardData.userTasks.filter((t) => {
    if (!t?.due_date) return false;
    return new Date(t.due_date) < new Date();
  }).length;

  // Build reminders array
  const reminders: Array<{
    type: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    details?: Record<string, unknown>;
    count?: number;
  }> = [];

  // Meeting reminders
  if (todayMeetingsCount > 0) {
    const nextMeeting = dashboardData.meetings[0];
    const meetingTime = format(new Date(nextMeeting.start_time), 'h:mm a');
    reminders.push({
      type: 'meeting',
      priority: 'high' as const,
      message: `عندك اجتماع "${nextMeeting.title}" الساعة ${meetingTime}`,
      details: nextMeeting,
    });
  }

  // Task reminders
  if (overdueTasksCount > 0) {
    reminders.push({
      type: 'overdue_tasks',
      priority: 'critical' as const,
      message: `عندك ${overdueTasksCount} مهام متأخرة لازم تخلصها`,
      count: overdueTasksCount,
    });
  }

  if (urgentTasksCount > 0) {
    reminders.push({
      type: 'urgent_tasks',
      priority: 'high' as const,
      message: `في ${urgentTasksCount} مهام عاجلة محتاجة انتباهك`,
      count: urgentTasksCount,
    });
  }

  // Motivational messages based on completed tasks
  const motivationalMessages = [];
  if (dashboardData.completedTasksCount > 10) {
    motivationalMessages.push('ماشاء الله! أسبوع منتج، خلصت أكثر من 10 مهام');
  }

  // Special messages for Fawzi
  if (isFawzi) {
    if (urgentTasksCount === 0 && overdueTasksCount === 0) {
      motivationalMessages.push('كل شي تحت السيطرة يا فوزي، ما في مهام عاجلة');
    }
    if (todayMeetingsCount > 2) {
      reminders.push({
        type: 'busy_day',
        priority: 'medium' as const,
        message: 'يوم مزدحم اليوم، خلي بالك من الوقت',
      });
    }
  }

  // Special messages for Moayad
  if (isMoayad) {
    if (dashboardData.completedTasksCount > 5) {
      motivationalMessages.push('عمل رائع يا مؤيد! استمر بنفس الحماس');
    }
    // Add learning tips
    if (Math.random() > 0.7) {
      motivationalMessages.push('نصيحة اليوم: جرب استخدم الـ AI لتسريع شغلك');
    }
  }

  // Friday blessing
  if (dashboardData.importantDates.some((d) => d.type === 'friday')) {
    motivationalMessages.push('جمعة مباركة! الله يوفقك في شغلك');
  }

  return {
    reminders,
    motivationalMessages,
    specialOccasions: dashboardData.importantDates,
    stats: {
      todayMeetingsCount,
      urgentTasksCount,
      overdueTasksCount,
      completedTasksCount: dashboardData.completedTasksCount,
    },
  };
}

export default async function DashboardPage() {
  const profile = await getCurrentUserProfile();
  const workspaceId = await getCurrentWorkspaceId();

  // Fetch dashboard data if user is logged in
  let dashboardData = null;
  let greetingData = null;

  if (profile?.id) {
    dashboardData = await getUserDashboardData(profile.id, workspaceId || undefined);
    greetingData = generatePersonalizedGreeting(
      profile.full_name || profile.email || '',
      dashboardData
    );
  }

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <DashboardClient
      greeting={greeting}
      dateString={format(now, 'EEEE, MMMM d')}
      user={
        profile
          ? {
              id: profile.id,
              name: profile.full_name || profile.email || 'User',
              email: profile.email || '',
              workspaceId: workspaceId || undefined,
            }
          : undefined
      }
      greetingData={greetingData}
    />
  );
}

// Helper function to get current workspace ID
async function getCurrentWorkspaceId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get the user's default workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('profile_id', user.id)
    .eq('is_default', true)
    .single();

  return membership?.workspace_id || null;
}
