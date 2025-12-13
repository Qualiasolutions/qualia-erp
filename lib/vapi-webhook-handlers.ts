/**
 * Enhanced VAPI Webhook Handlers with Intelligent Responses
 * Provides intelligent, varied responses for voice assistant interactions
 */

import { createClient } from '@/lib/supabase/server';
import {
  getDynamicPhrase,
  generateIntelligentResponse,
  type UserContext,
} from '@/lib/voice-assistant-intelligence';
import { format } from 'date-fns';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Enhanced handler for getting projects with intelligent responses
export async function handleGetProjectsIntelligently(
  args: { status?: string },
  workspaceId?: string,
  userContext?: UserContext
): Promise<string> {
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
    return getDynamicPhrase('error', userContext) + ` التفاصيل: ${error.message}`;
  }

  if (!projects || projects.length === 0) {
    return generateIntelligentResponse('no_results', null, userContext);
  }

  // Group by status for smart summary
  const byStatus: Record<string, typeof projects> = {};
  projects.forEach((p) => {
    const status = p.status || 'unknown';
    if (!byStatus[status]) byStatus[status] = [];
    byStatus[status].push(p);
  });

  // Build intelligent, varied response
  const parts: string[] = [];

  // Start with a dynamic opening
  const openings = [
    `${getDynamicPhrase('understood', userContext)} عندك ${projects.length} مشروع`,
    `شوف، في ${projects.length} مشاريع عندنا`,
    `خليني أحكيلك، عندنا ${projects.length} مشروع`,
  ];
  parts.push(openings[Math.floor(Math.random() * openings.length)]);

  // Status summary with variations
  if (byStatus['active']?.length) {
    const activeVariations = [
      `${byStatus['active'].length} نشط`,
      `${byStatus['active'].length} شغالين عليهم`,
      `${byStatus['active'].length} active حالياً`,
    ];
    parts.push(activeVariations[Math.floor(Math.random() * activeVariations.length)]);
  }

  if (byStatus['on_hold']?.length) {
    parts.push(`${byStatus['on_hold'].length} متوقف مؤقتاً`);
  }

  if (byStatus['completed']?.length) {
    parts.push(`${byStatus['completed'].length} خلصنا منهم`);
  }

  // Add urgent projects with varied language
  const urgentProjects = projects.filter((p) => {
    if (!p.target_date) return false;
    const daysLeft = Math.ceil(
      (new Date(p.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysLeft <= 7 && daysLeft >= 0;
  });

  if (urgentProjects.length > 0) {
    const urgentMsgs = [
      `انتبه! في ${urgentProjects.length} مشروع لازم يخلص هالأسبوع`,
      `مهم! ${urgentProjects.length} مشروع deadline قريب`,
      `في ${urgentProjects.length} مشروع urgent`,
    ];
    parts.push('. ' + urgentMsgs[Math.floor(Math.random() * urgentMsgs.length)]);

    urgentProjects.forEach((p) => {
      const daysLeft = Math.ceil(
        (new Date(p.target_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      parts.push(`"${p.name}" باقي ${daysLeft} يوم`);
    });
  }

  // Top 3 projects with dynamic descriptions
  parts.push('. أهم المشاريع:');
  projects.slice(0, 3).forEach((p) => {
    const projectTypeMap: Record<string, string> = {
      web_design: 'تصميم موقع',
      ai_agent: 'وكيل ذكاء اصطناعي',
      voice_agent: 'مساعد صوتي',
      seo: 'تحسين محركات بحث',
      ads: 'إعلانات رقمية',
    };
    const projectType = projectTypeMap[p.project_type || ''] || p.project_type;

    const leadName = Array.isArray(p.lead)
      ? (p.lead[0] as any)?.full_name
      : (p.lead as any)?.full_name;

    const projectDescriptions = [
      `"${p.name}" - ${projectType || 'مشروع'} (${p.status})${leadName ? `, مسؤول: ${leadName}` : ''}`,
      `مشروع "${p.name}" (${projectType}) - الحالة: ${p.status}`,
      `${projectType} "${p.name}" - ${p.status}`,
    ];

    parts.push(projectDescriptions[Math.floor(Math.random() * projectDescriptions.length)]);
  });

  // Add contextual follow-up
  if (userContext?.name?.toLowerCase().includes('fawzi')) {
    parts.push('. بدك تشوف التفاصيل التقنية لأي مشروع؟');
  } else if (userContext?.name?.toLowerCase().includes('moayad')) {
    parts.push('. بدك أشرحلك وضع أي مشروع بالتفصيل؟');
  } else {
    parts.push('. ' + generateIntelligentResponse('project', null, userContext));
  }

  return parts.join(' ');
}

// Enhanced handler for creating issues with intelligent responses
export async function handleCreateIssueIntelligently(
  args: {
    title: string;
    description?: string;
    priority?: string;
    projectId?: string;
  },
  userId?: string,
  workspaceId?: string,
  userContext?: UserContext
): Promise<string> {
  if (!userId) {
    return getDynamicPhrase('error', userContext) + ' لازم تكون مسجل دخول';
  }

  const supabase = await createClient();

  // Map priority from voice input
  const priorityMap: Record<string, string> = {
    urgent: 'urgent',
    high: 'high',
    medium: 'medium',
    low: 'low',
    عاجل: 'urgent',
    مهم: 'high',
    عادي: 'medium',
    'مش مستعجل': 'low',
  };

  const priority = priorityMap[args.priority?.toLowerCase() || ''] || 'medium';

  const { error } = await supabase
    .from('issues')
    .insert({
      title: args.title,
      description: args.description || '',
      priority,
      status: 'backlog',
      project_id: args.projectId,
      workspace_id: workspaceId,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    return getDynamicPhrase('error', userContext) + ` التفاصيل: ${error.message}`;
  }

  // Generate varied success response
  const responses = [
    generateIntelligentResponse('task_created', { title: args.title }, userContext),
    `${getDynamicPhrase('completed', userContext)} ضفت "${args.title}" بنجاح`,
    `تمام! المهمة "${args.title}" انضافت على البورد`,
  ];

  let response = responses[Math.floor(Math.random() * responses.length)];

  // Add priority info with variation
  if (priority === 'urgent' || priority === 'high') {
    const priorityMsgs = [
      ` وحطيتها ${priority === 'urgent' ? 'عاجلة' : 'مهمة'}`,
      ` - الأولوية: ${priority === 'urgent' ? 'urgent' : 'high'}`,
      ` (${priority === 'urgent' ? 'عاجل جداً' : 'أولوية عالية'})`,
    ];
    response += priorityMsgs[Math.floor(Math.random() * priorityMsgs.length)];
  }

  // Add follow-up question
  response += '. ' + generateIntelligentResponse('task', null, userContext);

  return response;
}

// Enhanced handler for getting team members
export async function handleGetTeamMembersIntelligently(
  workspaceId?: string,
  userContext?: UserContext
): Promise<string> {
  const supabase = await createClient();

  let query = supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url')
    .order('full_name');

  if (workspaceId) {
    const { data: memberIds } = await supabase
      .from('workspace_members')
      .select('profile_id')
      .eq('workspace_id', workspaceId);

    if (memberIds && memberIds.length > 0) {
      query = query.in(
        'id',
        memberIds.map((m) => m.profile_id)
      );
    }
  }

  const { data: members, error } = await query;

  if (error) {
    return getDynamicPhrase('error', userContext) + ` التفاصيل: ${error.message}`;
  }

  if (!members || members.length === 0) {
    return 'ما لقيت أعضاء فريق';
  }

  // Build intelligent team summary
  const parts: string[] = [];

  // Dynamic opening
  const openings = [
    `${getDynamicPhrase('understood', userContext)} الفريق عندنا ${members.length} شخص`,
    `في ${members.length} أعضاء بالفريق`,
    `الفريق مكون من ${members.length} أشخاص`,
  ];
  parts.push(openings[Math.floor(Math.random() * openings.length)]);

  // List members with varied format
  members.forEach((member) => {
    const role = member.role === 'admin' ? 'مدير' : 'موظف';
    const memberFormats = [
      `${member.full_name} (${role})`,
      `${member.full_name} - ${member.email}`,
      `${member.full_name}`,
    ];
    parts.push(memberFormats[Math.floor(Math.random() * memberFormats.length)]);
  });

  // Add contextual info for known users
  if (userContext?.name?.toLowerCase().includes('moayad')) {
    parts.push('. فوزي هو المطور الرئيسي، وإنت مسؤول العمليات');
  }

  return parts.join(', ');
}

// Enhanced handler for schedule with intelligent responses
export async function handleGetScheduleIntelligently(
  args: { date?: string },
  workspaceId?: string,
  userContext?: UserContext
): Promise<string> {
  const supabase = await createClient();

  // Parse date input
  const startDate = new Date();
  const endDate = new Date();

  if (args.date) {
    if (args.date === 'today' || args.date === 'اليوم') {
      endDate.setHours(23, 59, 59, 999);
    } else if (args.date === 'tomorrow' || args.date === 'بكرة') {
      startDate.setDate(startDate.getDate() + 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() + 1);
      endDate.setHours(23, 59, 59, 999);
    } else if (args.date === 'this week' || args.date === 'هالأسبوع') {
      endDate.setDate(endDate.getDate() + 7);
    }
  }

  let query = supabase
    .from('meetings')
    .select('*, client:clients(name), project:projects(name)')
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())
    .order('start_time');

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data: meetings, error } = await query;

  if (error) {
    return getDynamicPhrase('error', userContext) + ` التفاصيل: ${error.message}`;
  }

  if (!meetings || meetings.length === 0) {
    const noMeetingsResponses = [
      'ما في اجتماعات مجدولة',
      'الجدول فاضي، ما في meetings',
      'مافيش اجتماعات لهالفترة',
    ];
    return noMeetingsResponses[Math.floor(Math.random() * noMeetingsResponses.length)];
  }

  // Build intelligent schedule summary
  const parts: string[] = [];

  // Dynamic opening based on count
  if (meetings.length === 1) {
    parts.push('في اجتماع واحد بس');
  } else {
    const openings = [
      `في ${meetings.length} اجتماعات`,
      `عندك ${meetings.length} meetings`,
      `الجدول فيه ${meetings.length} اجتماع`,
    ];
    parts.push(openings[Math.floor(Math.random() * openings.length)]);
  }

  // List meetings with varied format
  meetings.forEach((meeting) => {
    const time = format(new Date(meeting.start_time), 'h:mm a');
    const client = Array.isArray(meeting.client)
      ? (meeting.client[0] as any)?.name
      : (meeting.client as any)?.name;
    const project = Array.isArray(meeting.project)
      ? (meeting.project[0] as any)?.name
      : (meeting.project as any)?.name;

    const meetingFormats = [
      `"${meeting.title}" الساعة ${time}${client ? ` مع ${client}` : ''}`,
      `${time}: ${meeting.title}${project ? ` (${project})` : ''}`,
      `اجتماع "${meeting.title}" على ${time}`,
    ];

    parts.push(meetingFormats[Math.floor(Math.random() * meetingFormats.length)]);
  });

  // Add contextual advice
  if (meetings.length > 3) {
    parts.push('. يوم مشغول، خلي بالك!');
  }

  return parts.join('. ');
}

// Enhanced handler for searching knowledge base
export async function handleSearchKnowledgeBaseIntelligently(
  args: { query: string },
  workspaceId?: string,
  userContext?: UserContext
): Promise<string> {
  if (!args.query) {
    return getDynamicPhrase('error', userContext) + ' لازم تحدد شو بدك تبحث عنه';
  }

  const supabase = await createClient();

  // Try database search first
  const { data: documents, error } = await supabase
    .from('documents')
    .select('title, content')
    .or(`title.ilike.%${args.query}%,content.ilike.%${args.query}%`)
    .limit(3);

  if (!error && documents && documents.length > 0) {
    const parts: string[] = [
      getDynamicPhrase('working', userContext),
      `لقيت ${documents.length} نتائج:`,
    ];

    documents.forEach((doc) => {
      parts.push(`**${doc.title}**\n${doc.content.substring(0, 200)}...`);
    });

    return parts.join('\n\n');
  }

  // If no results, return intelligent no-results message
  return generateIntelligentResponse('no_results', null, userContext);
}

// Enhanced handler for client info
export async function handleGetClientInfoIntelligently(
  args: { query?: string; status?: string },
  workspaceId?: string,
  userContext?: UserContext
): Promise<string> {
  const supabase = await createClient();

  let query = supabase
    .from('clients')
    .select('*, contacts:client_contacts(*)')
    .order('created_at', { ascending: false })
    .limit(10);

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  if (args.query) {
    query = query.ilike('name', `%${args.query}%`);
  }

  if (args.status) {
    query = query.eq('lead_status', args.status);
  }

  const { data: clients, error } = await query;

  if (error) {
    return getDynamicPhrase('error', userContext) + ` التفاصيل: ${error.message}`;
  }

  if (!clients || clients.length === 0) {
    return generateIntelligentResponse('no_results', null, userContext);
  }

  // Build intelligent client summary
  const parts: string[] = [];

  // Dynamic opening
  if (clients.length === 1) {
    const client = clients[0];
    parts.push(`لقيت معلومات ${client.name}`);

    // Status with variations
    const statusMap: Record<string, string> = {
      active_client: 'عميل نشط',
      inactive_client: 'عميل غير نشط',
      hot: 'lead ساخن',
      cold: 'lead بارد',
      dropped: 'dropped',
      dead_lead: 'lead ميت',
    };

    if (client.lead_status) {
      parts.push(`الحالة: ${statusMap[client.lead_status] || client.lead_status}`);
    }

    // Add contact info if available
    if (client.contacts && client.contacts.length > 0) {
      const contact = client.contacts[0] as any;
      parts.push(`جهة الاتصال: ${contact.name} (${contact.email || contact.phone})`);
    }
  } else {
    const openings = [
      `لقيت ${clients.length} عملاء`,
      `في ${clients.length} نتائج`,
      `عندنا ${clients.length} clients`,
    ];
    parts.push(openings[Math.floor(Math.random() * openings.length)]);

    // List top clients
    clients.slice(0, 3).forEach((client) => {
      parts.push(`${client.name} (${client.lead_status})`);
    });
  }

  // Add contextual follow-up for Moayad
  if (userContext?.name?.toLowerCase().includes('moayad')) {
    parts.push('. بدك تشوف تفاصيل أي عميل؟');
  }

  return parts.join('. ');
}
