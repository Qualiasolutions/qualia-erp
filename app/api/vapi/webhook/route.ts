import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { type UserContext } from '@/lib/voice-assistant-intelligence';
import {
  handleGetProjectsIntelligently,
  handleCreateIssueIntelligently,
  handleGetTeamMembersIntelligently,
  handleGetScheduleIntelligently,
  handleSearchKnowledgeBaseIntelligently,
  handleGetClientInfoIntelligently,
} from '@/lib/vapi-webhook-handlers';

// VAPI webhook types
interface VapiToolCallPayload {
  message: {
    type: 'tool-calls';
    toolCalls: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }>;
    toolCallList: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: Record<string, unknown>;
      };
    }>;
    call?: {
      assistantId?: string;
      metadata?: {
        userId?: string;
        workspaceId?: string;
        userName?: string;
      };
    };
  };
}

interface ToolResult {
  toolCallId: string;
  result: string;
}

// Built-in knowledge base for Qualia Solutions
const KNOWLEDGE_BASE: Record<string, string> = {
  // Company Info
  company: `Qualia Solutions is Cyprus's premier agency specializing in artificial intelligence development, intelligent automation, and modern web experiences. Founded by Fawzi and Moayad, we are a boutique software development and digital marketing agency based in Nicosia, Cyprus with operations in Jordan.

We transform businesses through cutting-edge AI solutions, from conversational agents to full-scale automation systems. Our team combines deep technical expertise with creative problem-solving to deliver solutions that drive real business value.

Our mission is to make advanced AI accessible to businesses of all sizes, helping them automate operations, enhance customer experiences, and stay ahead of the competition.

We specialize in:
1. Web Design & Development - Modern Next.js apps, React sites, custom platforms
2. AI Agent Development - Custom AI assistants, chatbots, voice agents, automation
3. SEO Services - Technical SEO, content strategy, search optimization
4. Digital Advertising - Google Ads, Meta Ads, performance marketing

Tech stack: Next.js, React, TypeScript, Supabase, Tailwind CSS, Vercel, VAPI, ElevenLabs, Deepgram`,

  team: `Qualia Solutions Team:

**Fawzi** - Founder & Lead Developer
- Full-stack developer with expertise in AI/ML, Next.js, React, and cloud architecture
- Handles all technical development, architecture decisions, and AI implementation
- Specializes in building voice AI agents, RAG systems, and automation workflows
- Based in Cyprus

**Moayad** - Co-founder & Operations
- Manages client relationships, project coordination, and business development
- Handles sales, marketing, and strategic partnerships
- Expert in understanding client needs and translating them into technical requirements
- Based in Jordan

Together, they bring a unique combination of technical excellence and business acumen to every project.`,

  services: `Our Services:

**Web Design & Development**
- Landing Pages (€500 - €1,500): Single-page websites, lead capture, mobile responsive
- Business Websites (€2,000 - €5,000): 5-10 pages, custom design, CMS integration
- E-commerce (€5,000 - €15,000): Full online store, payment integration, inventory
- Custom Web Apps (€10,000 - €50,000+): SaaS platforms, client portals, internal tools

**AI Agents & Voice AI**
- Support Agents (€3,000 - €8,000): 24/7 customer service, sentiment analysis, multi-language
- Sales Agents (€5,000 - €12,000): Lead qualification, meeting scheduling, CRM integration
- Executive Assistants (€4,000 - €10,000): Email triage, calendar management, data retrieval
- Neural Voice Agents (€5,000 - €15,000): Sub-500ms latency, bilingual Arabic/English

**Automation & Integration**
- Workflow Automation (€1,000 - €5,000): Business processes, data sync, notifications
- CRM Integration (€2,000 - €8,000): HubSpot, Salesforce, Pipedrive
- RAG Systems (€5,000 - €20,000): Knowledge bases, document Q&A, internal search

**SEO & Marketing**
- Technical SEO Audit (€500 - €1,500): Site speed, Core Web Vitals, schema markup
- Monthly SEO Retainer (€500 - €2,000/month): Keyword research, content optimization
- Google/Meta Ads (15-20% of ad spend, min €500/month): Campaign management`,

  ai_agents: `AI Agents & Voice AI Services:

**Support Agents** (€3,000 - €8,000)
- 24/7 customer service automation
- Sentiment analysis and escalation
- Multi-language support including Arabic
- Integration with CRM and helpdesk systems

**Sales Agents** (€5,000 - €12,000)
- Lead qualification and scoring
- Automated meeting scheduling
- CRM integration (HubSpot, Salesforce)
- Follow-up automation

**Executive Assistants** (€4,000 - €10,000)
- Email triage and prioritization
- Calendar management
- Data retrieval and reporting
- Task automation

**Neural Voice Agents** (€5,000 - €15,000)
- Sub-500ms response latency
- Natural conversational AI
- Built with VAPI, ElevenLabs, Deepgram
- Custom voice cloning available
- Bilingual support (Arabic/English)

All agents include custom training, system integration, analytics dashboard, and ongoing optimization.`,

  process: `Our Development Process:

**1. Discovery (1-2 days)**
- Initial consultation call
- Understanding your business goals
- Identifying pain points and opportunities
- Defining success metrics

**2. Proposal (1-2 days)**
- Detailed project scope
- Timeline and milestones
- Pricing breakdown
- Technical approach

**3. Design (3-5 days)**
- UI/UX wireframes
- Visual mockups in Figma
- Client feedback and revisions
- Design approval

**4. Development (1-4 weeks)**
- Agile sprints
- Regular progress updates
- Client demos
- Iterative refinement

**5. Testing (2-3 days)**
- Quality assurance
- Bug fixes
- Performance optimization
- Security review

**6. Launch (1 day)**
- Production deployment
- DNS configuration
- SSL setup
- Go-live checklist

**7. Support (Ongoing)**
- 30-day warranty included
- Optional maintenance plans
- Priority support available`,

  pricing: `Pricing Overview:

**Web Design & Development**
- Simple landing page: €500 - €1,500
- Business website (5-10 pages): €2,000 - €5,000
- E-commerce site: €5,000 - €15,000
- Custom web application: €10,000 - €50,000+

**AI Agents**
- Basic chatbot: €3,000 - €5,000
- Advanced AI agent: €5,000 - €12,000
- Voice AI agent: €5,000 - €15,000
- Enterprise AI system: €15,000 - €50,000+

**Automation**
- Simple workflow: €1,000 - €3,000
- Complex integration: €3,000 - €8,000
- RAG system: €5,000 - €20,000

**SEO & Marketing**
- SEO audit: €500 - €1,500
- Monthly SEO retainer: €500 - €2,000/month
- Ad management: 15-20% of ad spend (min €500/month)

**Payment Terms:**
- 50% upfront, 50% on completion
- Monthly retainers billed in advance
- 10% discount for annual commitments`,

  tools: `Technology Stack & Tools:

**Frontend Development**
- Next.js 14+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Three.js for 3D

**Backend & Database**
- Supabase (PostgreSQL)
- Vercel Edge Functions
- Node.js
- REST & GraphQL APIs

**AI & Machine Learning**
- OpenAI GPT-4
- Anthropic Claude
- Google Gemini
- LangChain
- Vector databases (pgvector)
- RAG pipelines

**Voice AI**
- VAPI (voice orchestration)
- ElevenLabs (text-to-speech)
- Deepgram (speech-to-text)
- Custom voice cloning

**Automation**
- n8n (self-hosted)
- Make.com
- Zapier
- Custom webhooks

**DevOps & Hosting**
- Vercel, Railway
- GitHub Actions
- Docker`,

  contact: `Contact Qualia Solutions:

**Office Address:**
LEDRA 145, First Floor
Nicosia, Cyprus

**Phone:**
+357 99 111 668

**Email:**
info@qualiasolutions.net
hello@qualia.solutions

**Website:**
https://qualiasolutions.net

**Working Hours:**
Sunday - Thursday: 9:00 AM - 6:00 PM (Cyprus/Jordan time)
Friday - Saturday: Closed

**Locations Served:**
- Cyprus (primary)
- Jordan (secondary)
- Remote clients worldwide (English & Arabic)`,

  industries: `Industries We Serve:

**Energy & Utilities** - Smart energy solutions, customer service automation
**Logistics & Transportation** - Route optimization, tracking portals, dispatch automation
**Real Estate** - Property listing platforms, virtual tours (3D), lead management
**E-commerce & Retail** - Online stores, inventory management, customer support bots
**Professional Services** - Law firms, accounting, consulting, healthcare
**Hospitality** - Hotel booking, restaurant reservations, feedback automation

We work with businesses of all sizes from startups to enterprise clients.`,

  why_us: `Why Choose Qualia Solutions:

**1. AI-First Approach** - We infuse intelligence into everything we create
**2. Boutique Agency Attention** - Work directly with our founders, no bureaucracy
**3. Bilingual Excellence** - Fluent in English and Arabic
**4. Modern Tech Stack** - Next.js, Supabase, Vercel for fast, secure, scalable solutions
**5. Transparent Pricing** - No hidden fees, detailed proposals upfront
**6. Speed to Market** - Launch your MVP in weeks, not months
**7. Ongoing Partnership** - Maintenance plans and ongoing support available
**8. Strategic Location** - Cyprus & Jordan serving Europe and Middle East`,
};

// Search knowledge base by keywords
function searchKnowledgeBase(query: string): string {
  const queryLower = query.toLowerCase();
  const results: string[] = [];

  // Check each knowledge base entry
  for (const [key, content] of Object.entries(KNOWLEDGE_BASE)) {
    if (
      queryLower.includes(key) ||
      key.includes(queryLower) ||
      content.toLowerCase().includes(queryLower)
    ) {
      results.push(content);
    }
  }

  // If no specific match, try fuzzy matching on common terms
  if (results.length === 0) {
    if (queryLower.match(/price|cost|how much|rate|fee|budget|quote/)) {
      return KNOWLEDGE_BASE['pricing'];
    }
    if (queryLower.match(/who|team|founder|fawzi|moayad|people|staff/)) {
      return KNOWLEDGE_BASE['team'];
    }
    if (queryLower.match(/what|service|offer|do you|provide|help/)) {
      return KNOWLEDGE_BASE['services'];
    }
    if (queryLower.match(/how|process|work|step|methodology|approach/)) {
      return KNOWLEDGE_BASE['process'];
    }
    if (queryLower.match(/contact|email|phone|reach|call|address|location/)) {
      return KNOWLEDGE_BASE['contact'];
    }
    if (queryLower.match(/tool|software|use|stack|tech|technology|framework/)) {
      return KNOWLEDGE_BASE['tools'];
    }
    if (queryLower.match(/voice|agent|chatbot|assistant|ai agent|automation/)) {
      return KNOWLEDGE_BASE['ai_agents'];
    }
    if (queryLower.match(/industry|sector|client|serve|work with/)) {
      return KNOWLEDGE_BASE['industries'];
    }
    if (queryLower.match(/why|choose|different|unique|advantage|benefit/)) {
      return KNOWLEDGE_BASE['why_us'];
    }

    return KNOWLEDGE_BASE['company'];
  }

  return results.join('\n\n---\n\n');
}

// Search documents in database (text-based search)
async function searchDocumentsInDB(query: string): Promise<string | null> {
  try {
    const supabase = await createClient();

    // Use ilike for simple text search across title and content
    const { data: documents, error } = await supabase
      .from('documents')
      .select('title, content')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .limit(3);

    if (error || !documents || documents.length === 0) {
      return null;
    }

    return documents.map((doc) => `**${doc.title}**\n${doc.content}`).join('\n\n---\n\n');
  } catch {
    return null;
  }
}

// Get user context from VAPI call metadata or auth
async function getUserContext(payload: VapiToolCallPayload) {
  const metadata = payload.message?.call?.metadata;

  if (metadata?.userId) {
    return {
      userId: metadata.userId,
      workspaceId: metadata.workspaceId,
      userName: metadata.userName,
    };
  }

  // Fallback to Supabase auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('profile_id', user.id)
      .eq('is_default', true)
      .single();

    return {
      userId: user.id,
      workspaceId: membership?.workspace_id,
      userName: profile?.full_name || user.email?.split('@')[0],
    };
  }

  return null;
}

/**
 * VAPI Webhook Handler
 * Handles tool calls from the Qualia voice assistant
 */
export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as VapiToolCallPayload;

    // Handle tool calls
    if (payload.message?.type === 'tool-calls') {
      const results: ToolResult[] = [];
      const userContext = await getUserContext(payload);

      for (const toolCall of payload.message.toolCallList || []) {
        const { name, arguments: args } = toolCall.function;
        let result: string;

        // Create UserContext for intelligent responses
        const intelligentContext: UserContext = {
          name: userContext?.userName,
          location: 'jordan',
          preferences: {
            language: 'arabic',
            formality: 'casual',
          },
        };

        try {
          switch (name) {
            case 'get_projects':
              result = await handleGetProjectsIntelligently(
                args as { status?: string },
                userContext?.workspaceId,
                intelligentContext
              );
              break;
            case 'get_issues':
              result = await handleGetIssues(
                args as { status?: string; priority?: string },
                userContext?.workspaceId
              );
              break;
            case 'create_issue':
              result = await handleCreateIssueIntelligently(
                args as {
                  title: string;
                  description?: string;
                  priority?: string;
                  projectId?: string;
                },
                userContext?.userId,
                userContext?.workspaceId,
                intelligentContext
              );
              break;
            case 'get_team_members':
              result = await handleGetTeamMembersIntelligently(
                userContext?.workspaceId,
                intelligentContext
              );
              break;
            case 'get_schedule':
              result = await handleGetScheduleIntelligently(
                args as { date?: string },
                userContext?.workspaceId,
                intelligentContext
              );
              break;
            case 'search_knowledge_base':
              result = await handleSearchKnowledgeBaseIntelligently(
                args as { query: string },
                userContext?.workspaceId,
                intelligentContext
              );
              break;
            case 'get_client_info':
              result = await handleGetClientInfoIntelligently(
                args as { query?: string; status?: string },
                userContext?.workspaceId,
                intelligentContext
              );
              break;
            case 'web_search':
              result = await handleWebSearch(args as { query: string });
              break;
            case 'update_issue':
              result = await handleUpdateIssue(
                args as {
                  issueId: string;
                  status?: string;
                  priority?: string;
                  assigneeId?: string;
                },
                userContext?.userId,
                userContext?.workspaceId
              );
              break;
            case 'create_meeting':
              result = await handleCreateMeeting(
                args as {
                  title: string;
                  startTime: string;
                  endTime?: string;
                  description?: string;
                  clientId?: string;
                  projectId?: string;
                },
                userContext?.userId,
                userContext?.workspaceId
              );
              break;
            case 'send_notification':
              result = await handleSendNotification(
                args as { message: string; recipientName?: string; type?: string },
                userContext?.userId,
                userContext?.userName,
                userContext?.workspaceId
              );
              break;
            default:
              result = `Unknown tool: ${name}`;
          }
        } catch (error) {
          console.error(`Error executing tool ${name}:`, error);
          result = `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }

        results.push({
          toolCallId: toolCall.id,
          result,
        });
      }

      return NextResponse.json({ results });
    }

    // Return empty response for other message types
    return NextResponse.json({});
  } catch (error) {
    console.error('VAPI webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Tool handlers
// NOTE: Some functions replaced by intelligent versions from lib/vapi-webhook-handlers.ts

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleGetProjects(args: { status?: string }, workspaceId?: string): Promise<string> {
  const supabase = await createClient();

  let query = supabase
    .from('projects')
    .select(
      'id, name, status, project_type, target_date, description, lead:profiles!projects_lead_id_fkey(full_name)'
    )
    .order('target_date', { ascending: true })
    .limit(10);

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  if (args.status && args.status !== 'all') {
    query = query.eq('status', args.status);
  }

  const { data: projects, error } = await query;

  if (error) {
    return `Error: ${error.message}`;
  }

  if (!projects || projects.length === 0) {
    return 'No projects found.';
  }

  // Group by status for smart summary
  const byStatus: Record<string, typeof projects> = {};
  for (const p of projects) {
    const status = p.status || 'active';
    if (!byStatus[status]) byStatus[status] = [];
    byStatus[status].push(p);
  }

  // Find urgent projects (deadline within 7 days)
  const now = new Date();
  const urgent = projects.filter((p) => {
    if (!p.target_date) return false;
    const deadline = new Date(p.target_date);
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 7 && daysLeft >= 0;
  });

  let response = `${projects.length} مشاريع`;

  // Status breakdown
  const statusParts = Object.entries(byStatus).map(([s, p]) => `${p.length} ${s}`);
  if (statusParts.length > 1) {
    response += ` (${statusParts.join(', ')})`;
  }

  // Urgent deadlines
  if (urgent.length > 0) {
    response += `. ⚠️ ${urgent.length} قريبة من الـ deadline: `;
    response += urgent
      .map((p) => {
        const deadline = new Date(p.target_date!);
        const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return `${p.name} (${daysLeft === 0 ? 'اليوم!' : daysLeft === 1 ? 'بكرا' : `${daysLeft} أيام`})`;
      })
      .join(', ');
  }

  // List top 5 briefly
  response += '. المشاريع: ';
  response += projects
    .slice(0, 5)
    .map((p) => {
      const type = p.project_type ? ` [${p.project_type.replace('_', ' ')}]` : '';
      return `${p.name}${type}`;
    })
    .join(', ');

  if (projects.length > 5) {
    response += ` +${projects.length - 5} more`;
  }

  return response;
}

async function handleGetIssues(
  args: { status?: string; priority?: string },
  workspaceId?: string
): Promise<string> {
  const supabase = await createClient();

  let query = supabase
    .from('issues')
    .select(
      'id, title, status, priority, project:projects(name), assignee:profiles!issues_assignee_id_fkey(full_name)'
    )
    .order('created_at', { ascending: false })
    .limit(15);

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  if (args.status && args.status !== 'all') {
    query = query.eq('status', args.status);
  }

  if (args.priority && args.priority !== 'all') {
    query = query.eq('priority', args.priority);
  }

  const { data: issues, error } = await query;

  if (error) {
    return `Error: ${error.message}`;
  }

  if (!issues || issues.length === 0) {
    return args.status ? `ما في مهام ${args.status}` : 'ما في مهام حالياً';
  }

  // Group by status
  const byStatus: Record<string, typeof issues> = {};
  for (const i of issues) {
    const status = i.status || 'backlog';
    if (!byStatus[status]) byStatus[status] = [];
    byStatus[status].push(i);
  }

  // Find urgent/high priority
  const urgent = issues.filter(
    (i) => i.priority?.toLowerCase() === 'urgent' || i.priority?.toLowerCase() === 'high'
  );

  // Smart summary
  let response = `${issues.length} مهام`;

  // Priority breakdown
  if (urgent.length > 0) {
    response += `. 🔴 ${urgent.length} مهم/urgent: `;
    response += urgent
      .slice(0, 3)
      .map((i) => i.title)
      .join(', ');
    if (urgent.length > 3) response += `... +${urgent.length - 3}`;
  }

  // Status breakdown
  const inProgress = byStatus['In Progress'] || byStatus['in_progress'] || [];
  const todo = byStatus['Todo'] || byStatus['todo'] || [];

  if (inProgress.length > 0) {
    response += `. قيد التنفيذ (${inProgress.length}): `;
    response += inProgress
      .slice(0, 2)
      .map((i) => i.title)
      .join(', ');
  }

  if (todo.length > 0 && inProgress.length === 0) {
    response += `. للعمل (${todo.length}): `;
    response += todo
      .slice(0, 3)
      .map((i) => i.title)
      .join(', ');
  }

  // If filtering by specific status, list them
  if (args.status) {
    const filtered = byStatus[args.status] || [];
    if (filtered.length > 0) {
      response = `${filtered.length} مهام ${args.status}: `;
      response += filtered
        .slice(0, 5)
        .map((i) => {
          const priority = i.priority ? ` [${i.priority}]` : '';
          return `${i.title}${priority}`;
        })
        .join(', ');
    }
  }

  return response;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleCreateIssue(
  args: {
    title: string;
    description?: string;
    priority?: string;
    projectId?: string;
  },
  userId?: string,
  workspaceId?: string
): Promise<string> {
  if (!userId) {
    return 'ما قدرت أضيف المهمة - محتاج تسجل دخول';
  }

  const supabase = await createClient();

  const { data: issue, error } = await supabase
    .from('issues')
    .insert({
      title: args.title,
      description: args.description || null,
      priority: args.priority || 'Medium',
      project_id: args.projectId || null,
      status: 'Todo',
      creator_id: userId,
      workspace_id: workspaceId || null,
    })
    .select()
    .single();

  if (error) {
    return `ما زبط: ${error.message}`;
  }

  // Log activity
  await supabase.from('activities').insert({
    actor_id: userId,
    type: 'issue_created',
    issue_id: issue.id,
    project_id: args.projectId || null,
    workspace_id: workspaceId || null,
    metadata: { title: issue.title, priority: issue.priority, created_by_voice: true },
  });

  const priorityMap: Record<string, string> = {
    Urgent: 'عاجل 🔴',
    High: 'مهم',
    Medium: 'عادي',
    Low: 'مش مستعجل',
  };
  const priorityArabic = priorityMap[issue.priority as string] || issue.priority;

  return `تم ✅ أضفت "${issue.title}" - ${priorityArabic}`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleGetTeamMembers(workspaceId?: string): Promise<string> {
  const supabase = await createClient();

  let query;

  if (workspaceId) {
    // Get workspace members with their profiles
    query = supabase
      .from('workspace_members')
      .select('role, profile:profiles(full_name, email, role)')
      .eq('workspace_id', workspaceId)
      .limit(20);
  } else {
    // Fallback to all profiles
    query = supabase.from('profiles').select('id, full_name, email, role').limit(20);
  }

  const { data: members, error } = await query;

  if (error) {
    return `Error: ${error.message}`;
  }

  if (!members || members.length === 0) {
    return 'ما في أعضاء بالفريق';
  }

  const roleLabels: Record<string, string> = {
    owner: 'مالك',
    admin: 'مدير',
    member: 'عضو',
  };

  const memberNames = members.map((m) => {
    if ('profile' in m) {
      const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
      const role = roleLabels[m.role || ''] || m.role || '';
      return `${profile?.full_name || profile?.email}${role ? ` (${role})` : ''}`;
    }
    return m.full_name || m.email;
  });

  return `الفريق (${members.length}): ${memberNames.join(', ')}`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleGetSchedule(args: { date?: string }, workspaceId?: string): Promise<string> {
  const supabase = await createClient();

  // Calculate date range
  let startDate: Date;
  let endDate: Date;
  const now = new Date();
  let periodLabel = 'هالأسبوع';

  switch (args.date?.toLowerCase()) {
    case 'today':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      periodLabel = 'اليوم';
      break;
    case 'tomorrow':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() + 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      periodLabel = 'بكرا';
      break;
    case 'this week':
    default:
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      break;
  }

  let query = supabase
    .from('meetings')
    .select('id, title, start_time, end_time, description, client:clients(display_name)')
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())
    .order('start_time', { ascending: true })
    .limit(10);

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data: meetings, error } = await query;

  if (error) {
    return `Error: ${error.message}`;
  }

  if (!meetings || meetings.length === 0) {
    return `ما في اجتماعات ${periodLabel}. الجدول فاضي 👍`;
  }

  // Smart time formatting
  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'مساءً' : 'صباحاً';
    const h = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return minutes > 0 ? `${h}:${minutes.toString().padStart(2, '0')} ${period}` : `${h} ${period}`;
  };

  const formatDay = (date: Date) => {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'اليوم';
    if (date.toDateString() === tomorrow.toDateString()) return 'بكرا';
    return days[date.getDay()];
  };

  let response = `${meetings.length} اجتماع ${periodLabel}: `;

  response += meetings
    .map((m) => {
      const start = new Date(m.start_time);
      const client = Array.isArray(m.client) ? m.client[0] : m.client;
      const clientInfo = client?.display_name ? ` مع ${client.display_name}` : '';
      const day = periodLabel === 'اليوم' || periodLabel === 'بكرا' ? '' : `${formatDay(start)} `;
      return `${m.title}${clientInfo} (${day}${formatTime(start)})`;
    })
    .join(', ');

  // Check for upcoming meeting today
  const upcomingToday = meetings.find((m) => {
    const start = new Date(m.start_time);
    return start.toDateString() === now.toDateString() && start > now;
  });

  if (upcomingToday) {
    const start = new Date(upcomingToday.start_time);
    const minutesUntil = Math.round((start.getTime() - now.getTime()) / (1000 * 60));
    if (minutesUntil <= 60) {
      response += `. ⏰ التالي بعد ${minutesUntil} دقيقة!`;
    }
  }

  return response;
}

/**
 * Search the knowledge base
 * Tries database text search first, then falls back to built-in knowledge base
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleSearchKnowledgeBase(
  args: { query: string },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _workspaceId?: string
): Promise<string> {
  if (!args.query) {
    return 'Please provide a search query.';
  }

  try {
    // Try database text search first
    const dbResult = await searchDocumentsInDB(args.query);
    if (dbResult) {
      return dbResult;
    }

    // Fall back to built-in knowledge base
    return searchKnowledgeBase(args.query);
  } catch (error) {
    console.error('Knowledge base search error:', error);
    // Fall back to built-in knowledge base on any error
    return searchKnowledgeBase(args.query);
  }
}

/**
 * Web search using a simple search API
 */
async function handleWebSearch(args: { query: string }): Promise<string> {
  if (!args.query) {
    return 'Please provide a search query.';
  }

  try {
    // Use DuckDuckGo instant answer API (free, no key required)
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(args.query)}&format=json&no_html=1&skip_disambig=1`
    );

    if (!response.ok) {
      return `Unable to search. Please try again later.`;
    }

    const data = await response.json();

    // Extract relevant information
    const results: string[] = [];

    if (data.AbstractText) {
      results.push(data.AbstractText);
    }

    if (data.Answer) {
      results.push(`Answer: ${data.Answer}`);
    }

    // Add related topics if available
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      const topics = data.RelatedTopics.slice(0, 3)
        .filter((t: { Text?: string }) => t.Text)
        .map((t: { Text: string }) => `- ${t.Text}`)
        .join('\n');
      if (topics) {
        results.push(`Related:\n${topics}`);
      }
    }

    if (results.length === 0) {
      return `I searched for "${args.query}" but couldn't find specific information. Try rephrasing your question.`;
    }

    return results.join('\n\n');
  } catch (error) {
    console.error('Web search error:', error);
    return `Unable to search right now. Please try again later.`;
  }
}

/**
 * Get client/lead information
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleGetClientInfo(
  args: { query?: string; status?: string },
  workspaceId?: string
): Promise<string> {
  const supabase = await createClient();

  let query = supabase
    .from('clients')
    .select(
      'display_name, phone, website, lead_status, notes, assigned:profiles!clients_assigned_to_fkey(full_name)'
    )
    .order('display_name')
    .limit(10);

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  if (args.query) {
    query = query.ilike('display_name', `%${args.query}%`);
  }

  if (args.status) {
    query = query.eq('lead_status', args.status);
  }

  const { data: clients, error } = await query;

  if (error) {
    return `Error: ${error.message}`;
  }

  if (!clients || clients.length === 0) {
    return args.query ? `ما لقيت عميل باسم "${args.query}"` : 'ما في عملاء حالياً';
  }

  // Group by status
  const statusLabels: Record<string, string> = {
    active_client: 'عميل نشط 🟢',
    hot: 'ساخن 🔥',
    cold: 'بارد ❄️',
    inactive_client: 'غير نشط',
    dropped: 'ملغي',
  };

  // If searching for specific client, give details
  if (args.query && clients.length === 1) {
    const c = clients[0];
    const status = statusLabels[c.lead_status || ''] || c.lead_status;
    const assigned = Array.isArray(c.assigned) ? c.assigned[0] : c.assigned;
    let response = `${c.display_name} - ${status}`;
    if (c.phone) response += `. تلفون: ${c.phone}`;
    if (assigned?.full_name) response += `. مع ${assigned.full_name}`;
    if (c.notes) response += `. ملاحظات: ${c.notes.slice(0, 100)}`;
    return response;
  }

  // Summary for multiple clients
  const byStatus: Record<string, typeof clients> = {};
  for (const c of clients) {
    const status = c.lead_status || 'unknown';
    if (!byStatus[status]) byStatus[status] = [];
    byStatus[status].push(c);
  }

  let response = `${clients.length} عملاء`;

  // Hot leads first
  const hot = byStatus['hot'] || [];
  if (hot.length > 0) {
    response += `. 🔥 ساخنين (${hot.length}): ${hot.map((c) => c.display_name).join(', ')}`;
  }

  // Active clients
  const active = byStatus['active_client'] || [];
  if (active.length > 0) {
    response += `. نشطين (${active.length}): ${active
      .slice(0, 3)
      .map((c) => c.display_name)
      .join(', ')}`;
  }

  // List others briefly
  const others = clients.filter(
    (c) => c.lead_status !== 'hot' && c.lead_status !== 'active_client'
  );
  if (others.length > 0 && hot.length === 0 && active.length === 0) {
    response += `: ${others
      .slice(0, 5)
      .map((c) => {
        const status = statusLabels[c.lead_status || ''] || '';
        return `${c.display_name}${status ? ` (${status})` : ''}`;
      })
      .join(', ')}`;
  }

  return response;
}

/**
 * Update an existing issue
 */
async function handleUpdateIssue(
  args: { issueId: string; status?: string; priority?: string; assigneeId?: string },
  userId?: string,
  workspaceId?: string
): Promise<string> {
  if (!userId) {
    return 'ما قدرت أحدث - محتاج تسجل دخول';
  }

  if (!args.issueId) {
    return 'محتاج رقم المهمة عشان أحدثها';
  }

  const supabase = await createClient();

  // Build update object with only provided fields
  const updates: Record<string, unknown> = {};
  if (args.status) updates.status = args.status;
  if (args.priority) updates.priority = args.priority;
  if (args.assigneeId) updates.assignee_id = args.assigneeId;

  if (Object.keys(updates).length === 0) {
    return 'شو بدك تحدث؟ قلي الـ status أو priority';
  }

  // Get existing issue first
  const { data: existingIssue } = await supabase
    .from('issues')
    .select('title, status, priority')
    .eq('id', args.issueId)
    .single();

  if (!existingIssue) {
    return `ما لقيت المهمة`;
  }

  const { data: issue, error } = await supabase
    .from('issues')
    .update(updates)
    .eq('id', args.issueId)
    .select()
    .single();

  if (error) {
    return `ما زبط: ${error.message}`;
  }

  // Log activity
  await supabase.from('activities').insert({
    actor_id: userId,
    type: 'issue_updated',
    issue_id: issue.id,
    workspace_id: workspaceId || null,
    metadata: {
      title: issue.title,
      changes: updates,
      updated_by_voice: true,
    },
  });

  // Smart change summary
  const changes: string[] = [];
  if (args.status) {
    const statusArabic: Record<string, string> = {
      Done: 'خلصت ✅',
      'In Progress': 'قيد التنفيذ',
      Todo: 'للعمل',
      Canceled: 'ملغاة',
    };
    changes.push(statusArabic[args.status] || args.status);
  }
  if (args.priority) {
    const priorityArabic: Record<string, string> = {
      Urgent: 'عاجل 🔴',
      High: 'مهم',
      Medium: 'عادي',
      Low: 'مش مستعجل',
    };
    changes.push(priorityArabic[args.priority] || args.priority);
  }

  return `تم ✅ "${issue.title}" - ${changes.join(', ')}`;
}

/**
 * Create a new meeting
 */
async function handleCreateMeeting(
  args: {
    title: string;
    startTime: string;
    endTime?: string;
    description?: string;
    clientId?: string;
    projectId?: string;
  },
  userId?: string,
  workspaceId?: string
): Promise<string> {
  if (!userId) {
    return 'ما قدرت أحدد الاجتماع - محتاج تسجل دخول';
  }

  if (!args.title || !args.startTime) {
    return 'محتاج اسم الاجتماع ووقته';
  }

  const supabase = await createClient();

  // Parse start time - support natural language
  let startTime: Date;
  const now = new Date();

  if (args.startTime.toLowerCase().includes('today')) {
    startTime = new Date(now);
    const timeMatch = args.startTime.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2] || '0');
      const period = timeMatch[3]?.toLowerCase();
      if (period === 'pm' && hours < 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;
      startTime.setHours(hours, minutes, 0, 0);
    }
  } else if (args.startTime.toLowerCase().includes('tomorrow')) {
    startTime = new Date(now);
    startTime.setDate(startTime.getDate() + 1);
    const timeMatch = args.startTime.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2] || '0');
      const period = timeMatch[3]?.toLowerCase();
      if (period === 'pm' && hours < 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;
      startTime.setHours(hours, minutes, 0, 0);
    }
  } else {
    startTime = new Date(args.startTime);
  }

  if (isNaN(startTime.getTime())) {
    return `ما فهمت الوقت "${args.startTime}" - جرب قول "بكرا الساعة 3" أو "اليوم 2pm"`;
  }

  // Default end time to 1 hour after start
  const endTime = args.endTime
    ? new Date(args.endTime)
    : new Date(startTime.getTime() + 60 * 60 * 1000);

  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert({
      title: args.title,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      description: args.description || null,
      client_id: args.clientId || null,
      project_id: args.projectId || null,
      creator_id: userId,
      workspace_id: workspaceId || null,
    })
    .select()
    .single();

  if (error) {
    return `ما زبط: ${error.message}`;
  }

  // Log activity
  await supabase.from('activities').insert({
    actor_id: userId,
    type: 'meeting_created',
    workspace_id: workspaceId || null,
    metadata: {
      title: meeting.title,
      start_time: meeting.start_time,
      created_by_voice: true,
    },
  });

  // Format time in Arabic style
  const formatTimeArabic = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'مساءً' : 'صباحاً';
    const h = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return minutes > 0 ? `${h}:${minutes.toString().padStart(2, '0')} ${period}` : `${h} ${period}`;
  };

  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const isToday = startTime.toDateString() === now.toDateString();
  const isTomorrow = startTime.toDateString() === new Date(now.getTime() + 86400000).toDateString();

  let dayStr = days[startTime.getDay()];
  if (isToday) dayStr = 'اليوم';
  if (isTomorrow) dayStr = 'بكرا';

  return `تم ✅ "${meeting.title}" - ${dayStr} ${formatTimeArabic(startTime)}`;
}

/**
 * Send a notification (logs to activities for now)
 */
async function handleSendNotification(
  args: { message: string; recipientName?: string; type?: string },
  userId?: string,
  userName?: string,
  workspaceId?: string
): Promise<string> {
  if (!userId) {
    return 'ما قدرت أبعث - محتاج تسجل دخول';
  }

  if (!args.message) {
    return 'شو الرسالة؟';
  }

  const supabase = await createClient();

  // Find recipient if name provided
  let recipientId: string | null = null;
  let recipientFullName: string | null = null;

  if (args.recipientName) {
    const { data: recipient } = await supabase
      .from('profiles')
      .select('id, full_name')
      .ilike('full_name', `%${args.recipientName}%`)
      .limit(1)
      .single();

    if (recipient) {
      recipientId = recipient.id;
      recipientFullName = recipient.full_name;
    }
  }

  // Log as activity (notification system)
  const { error } = await supabase.from('activities').insert({
    actor_id: userId,
    type: 'notification_sent',
    workspace_id: workspaceId || null,
    metadata: {
      message: args.message,
      from: userName || 'Voice Assistant',
      to: recipientFullName || args.recipientName || 'Team',
      recipient_id: recipientId,
      notification_type: args.type || 'general',
      sent_by_voice: true,
    },
  });

  if (error) {
    return `ما زبط: ${error.message}`;
  }

  const recipient = recipientFullName || args.recipientName || 'الفريق';
  const typeEmoji = args.type === 'urgent' ? '🔴' : args.type === 'reminder' ? '⏰' : '📨';
  return `${typeEmoji} تم إرسال الرسالة لـ ${recipient}`;
}
