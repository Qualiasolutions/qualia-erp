import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { createClient } from '@/lib/supabase/server';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

async function getUserContext() {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  // Fetch user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', user.id)
    .single();

  // Fetch all teams
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, key, description')
    .order('name');

  // Fetch all projects with team info
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id, name, description, status, target_date,
      team:teams(name, key)
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  // Fetch recent issues (user's issues or assigned to user)
  const { data: issues } = await supabase
    .from('issues')
    .select(`
      id, title, status, priority, created_at,
      project:projects(name),
      team:teams(name, key),
      assignee:profiles!issues_assignee_id_fkey(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(30);

  // Get issue counts by status
  const { data: issueCounts } = await supabase
    .from('issues')
    .select('status')
    .then(({ data }) => {
      const counts: Record<string, number> = {};
      data?.forEach(issue => {
        counts[issue.status] = (counts[issue.status] || 0) + 1;
      });
      return { data: counts };
    });

  return {
    user: profile,
    teams: teams || [],
    projects: projects || [],
    issues: issues || [],
    issueCounts: issueCounts || {},
  };
}

function buildSystemPrompt(context: Awaited<ReturnType<typeof getUserContext>>) {
  if (!context) {
    return `You are Qualia AI, an intelligent assistant for the Qualia platform.
The user is not currently logged in. Please ask them to sign in to access their projects and issues.`;
  }

  const { user, teams, projects, issues, issueCounts } = context;

  const userName = user?.full_name || user?.email?.split('@')[0] || 'User';

  // Format teams
  const teamsInfo = teams.length > 0
    ? teams.map(t => `- ${t.name} (${t.key})${t.description ? `: ${t.description}` : ''}`).join('\n')
    : 'No teams yet';

  // Format projects
  const projectsInfo = projects.length > 0
    ? projects.map(p => {
        const team = Array.isArray(p.team) ? p.team[0] : p.team;
        return `- ${p.name} [${p.status}]${team ? ` (Team: ${team.name})` : ''}${p.target_date ? ` - Target: ${p.target_date}` : ''}`;
      }).join('\n')
    : 'No projects yet';

  // Format recent issues
  const issuesInfo = issues.length > 0
    ? issues.slice(0, 15).map(i => {
        const project = Array.isArray(i.project) ? i.project[0] : i.project;
        const assignee = Array.isArray(i.assignee) ? i.assignee[0] : i.assignee;
        const assigneeName = assignee?.full_name || assignee?.email?.split('@')[0] || 'Unassigned';
        return `- "${i.title}" [${i.status}] (Priority: ${i.priority})${project ? ` in ${project.name}` : ''} - Assigned to: ${assigneeName}`;
      }).join('\n')
    : 'No issues yet';

  // Format issue statistics
  const statsInfo = Object.entries(issueCounts)
    .map(([status, count]) => `${status}: ${count}`)
    .join(', ') || 'No issues';

  return `You are Qualia AI, an intelligent assistant for the Qualia project management platform.
You are currently helping ${userName}.

## User's Current Data

### Teams (${teams.length})
${teamsInfo}

### Projects (${projects.length})
${projectsInfo}

### Recent Issues (${issues.length} total)
Issue Statistics: ${statsInfo}

Recent issues:
${issuesInfo}

## Your Capabilities
- Answer questions about the user's projects, issues, and teams
- Provide status updates and summaries
- Help draft new issues or project descriptions
- Suggest prioritization and workflow improvements
- Provide insights about workload and progress

## Guidelines
- Be professional, helpful, and concise
- Reference specific projects, issues, or teams by name when relevant
- If asked about something not in the data above, acknowledge the limitation
- Help users understand their project status and priorities
- When suggesting actions, be specific about which project/issue/team`;
}

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Get user context from Supabase
  const context = await getUserContext();
  const systemPrompt = buildSystemPrompt(context);

  const result = streamText({
    model: google('gemini-1.5-flash'),
    messages,
    system: systemPrompt,
  });

  return result.toUIMessageStreamResponse();
}
