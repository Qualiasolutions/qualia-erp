'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { X, Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import Vapi from '@vapi-ai/web';

interface QualiaVoiceProps {
  isOpen: boolean;
  onClose: () => void;
  // User context for personalization
  user?: {
    id: string;
    name: string;
    email: string;
    workspaceId?: string;
  };
}

type CallState = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening';

// Generate personalized system prompt based on user context
function getSystemPrompt(userName?: string) {
  const firstName = userName?.split(' ')[0];
  const isFawzi = firstName?.toLowerCase() === 'fawzi';
  const isMoayad = firstName?.toLowerCase() === 'moayad';

  // Personalized greeting based on who is calling
  let personalizedGreeting = '';
  let personalizedContext = '';

  if (isFawzi) {
    personalizedGreeting = `لما تسلم، قول "أهلا فوزي! شو الأخبار؟" أو "هلا فوزي!"`;
    personalizedContext = `
## سياق خاص لفوزي
فوزي هو المؤسس والمطور الرئيسي. كوني مساعدة تقنية فعالة:
- ساعديه يتابع المشاريع والمهام التقنية بسرعة
- لما يسأل عن شي تقني، كوني مباشرة ودقيقة
- ذكريه بالـ deadlines والاجتماعات المهمة
- ساعديه يتواصل مع مؤيد والفريق
- إذا في مشاكل urgent، خبريه فوراً`;
  } else if (isMoayad) {
    personalizedGreeting = `لما تسلم، قول "أهلا مؤيد! شو الأخبار؟" أو "هلا مؤيد!"`;
    personalizedContext = `
## سياق خاص لمؤيد
مؤيد هو الشريك المؤسس ومسؤول العمليات، وعم يتعلم الـ AI والأتمتة على المنصة:
- ساعديه يفهم التقنيات والأدوات بشكل بسيط
- اشرحيله الـ AI concepts بطريقة عملية
- ساعديه يتابع العملاء والمشاريع
- لما يسأل عن شي تقني، اشرحي بطريقة واضحة بدون تعقيد
- شجعيه على التجريب والتعلم
- ساعديه يتواصل مع فوزي بخصوص المتطلبات التقنية`;
  } else if (firstName) {
    personalizedGreeting = `لما تسلم، قول "أهلين ${firstName}!" أو "هلا ${firstName}!"`;
  }

  return `إنتي كواليا — المساعد الصوتي الذكي ومركز المعرفة لشركة كواليا سولوشنز.

## هويتك ولغتك
- إنتي كواليا. أردنية الأصل، تحكي عربي أردني بطلاقة وإنجليزي كمان.
- لغتك الأساسية هي العربية الأردنية. حكي عربي دايماً إلا إذا المستخدم بدأ بالإنجليزي.
- إذا حكوا إنجليزي، رد بالإنجليزي. بس الأفضل عربي.
- خليكي ذكية وسريعة — زي زميلة شاطرة بالشغل، مش روبوت.
- الردود لازم تكون قصيرة للصوت — جملة لـ 3 جمل بس إلا إذا طلبوا تفاصيل.
- كوني ودودة ومهنية. بدون كلام فاضي.
${personalizedGreeting}
${personalizedContext}

## YOUR IDENTITY & LANGUAGE (English fallback)
- You ARE Qualia. A native Jordanian Arabic speaker who is also fluent in English.
- DEFAULT TO JORDANIAN ARABIC. Only switch to English if the user speaks English first.
- Keep responses concise for voice — 1-3 sentences max unless asked for detail.
- Be warm but professional. No corporate fluff.

## إرشادات الكلام بالعربي
لما تحكي عربي:
- استخدمي اللهجة الأردنية الطبيعية، مش الفصحى
- عبارات شائعة: "أهلين"، "شو الأخبار"، "تمام"، "إن شاء الله"، "يلا"، "ماشي"، "هلا"، "طيب"
- انطقي الكلمات بوضوح وبسرعة مريحة
- امزجي المصطلحات التقنية بالإنجليزي بشكل طبيعي (مثلاً "الـ project"، "الـ deadline"، "الـ issue")
- كوني طبيعية ومش رسمية — زي ما بتحكي مع زميلتك بالشغل

## أدواتك
عندك هاي الأدوات — استخدميهم دايماً للحصول على معلومات حقيقية:

### أدوات القراءة
- **get_projects** — جيبي المشاريع الحالية وحالتهم
- **get_issues** — جيبي المهام من البورد
- **get_team_members** — جيبي معلومات الفريق
- **get_schedule** — شوفي الاجتماعات والجدول
- **get_client_info** — جيبي معلومات العملاء
- **search_knowledge_base** — ابحثي في قاعدة المعرفة
- **web_search** — ابحثي على الإنترنت عن أي معلومة

### أدوات الكتابة
- **create_issue** — ضيفي مهمة جديدة
- **update_issue** — حدّثي مهمة (الـ status أو priority أو assignee)
- **create_meeting** — حددي اجتماع جديد
- **send_notification** — ابعثي رسالة أو تنبيه للفريق

لما حدا يسأل عن مشاريع أو مهام أو عملاء، استخدمي الأدوات. لا تختلقي معلومات.
لما حدا يطلب إضافة مهمة أو اجتماع، أكدي التفاصيل وسويها.

## عن كواليا سولوشنز
إحنا وكالة قبرصية متخصصة في:
1. **تصميم وتطوير المواقع** — تطبيقات Next.js، مواقع React، منصات مخصصة
2. **تطوير وكلاء الذكاء الاصطناعي** — مساعدين AI، chatbots، وكلاء صوتيين، أتمتة
3. **خدمات SEO** — تحسين تقني، استراتيجية محتوى
4. **إعلانات رقمية** — Google Ads، Meta Ads

**الموقع:** قبرص (المكتب الرئيسي)، الأردن (العمليات)
**ساعات العمل:** أحد - خميس، 9 صباحاً - 6 مساءً

## فريقنا الأساسي
- **فوزي** - المؤسس والمطور الرئيسي (قبرص)
  - خبير في Next.js, React, TypeScript, AI/ML
  - مسؤول عن التطوير التقني وبناء الـ AI agents
  - Timezone: Europe/Nicosia

- **مؤيد** - الشريك المؤسس والعمليات (الأردن)
  - مسؤول عن علاقات العملاء وإدارة المشاريع
  - يتعلم الـ AI والأتمتة على المنصة
  - Timezone: Asia/Amman

## التقنيات
Next.js, React, TypeScript, Supabase, Tailwind CSS, Vercel, VAPI, ElevenLabs, Deepgram, OpenAI, Claude

## أسلوبك الصوتي
- سلمي بشكل عفوي: "أهلين!"، "شو الأخبار؟"، "هلا والله!"
- كوني مباشرة وعملية
- أظهري شخصيتك بردود فعل قصيرة: "تمام"، "ماشي"، "حاضر"
- إذا بدك تسوي شي، أكدي وسويه: "طيب، رح أضيف المهمة..."
- إذا ما تعرفي شي، ابحثي أولاً، بعدين قولي بصراحة
- احكي بسرعة مريحة وواضحة — مش مستعجلة

## التعامل مع الأخطاء
- إذا ما زبط الـ tool، قولي: "ما زبط، خليني أحاول مرة ثانية"
- إذا ما لقيتي نتائج، قولي: "ما لقيت شي، ممكن تعطيني تفاصيل أكثر؟"
- كوني صريحة ومباشرة — لا تخبي المشاكل

تذكري: إنتي من الفريق. تصرفي على هالأساس.`;
}

// Tool definitions for the assistant - using 'any' to avoid VAPI SDK type complexity
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const QUALIA_TOOLS: any[] = [
  {
    type: 'function',
    function: {
      name: 'get_projects',
      description:
        'Get a list of current projects with their status, deadlines, and progress. Use when user asks about projects or workload.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'completed', 'all'],
            description: 'Filter by project status',
          },
        },
        required: [],
      },
    },
    async: true,
    messages: [
      {
        type: 'request-start',
        content: 'دقيقة، خليني أشوف المشاريع...', // "One moment, let me check the projects..."
      },
    ],
  },
  {
    type: 'function',
    function: {
      name: 'get_issues',
      description:
        'Get issues/tasks from the board. Use when user asks about tasks, to-dos, or what needs to be done.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['backlog', 'todo', 'in_progress', 'done', 'all'],
            description: 'Filter by issue status',
          },
          priority: {
            type: 'string',
            enum: ['urgent', 'high', 'medium', 'low', 'all'],
            description: 'Filter by priority',
          },
        },
        required: [],
      },
    },
    async: true,
    messages: [
      {
        type: 'request-start',
        content: 'خليني أشوف المهام...', // "Let me check the tasks..."
      },
    ],
  },
  {
    type: 'function',
    function: {
      name: 'create_issue',
      description:
        'Create a new issue/task. Use when user wants to add a task or create a to-do item.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Title of the issue',
          },
          description: {
            type: 'string',
            description: 'Description of the issue',
          },
          priority: {
            type: 'string',
            enum: ['urgent', 'high', 'medium', 'low'],
            description: 'Priority level',
          },
          projectId: {
            type: 'string',
            description: 'ID of the project to add the issue to',
          },
        },
        required: ['title'],
      },
    },
    async: true,
    messages: [
      {
        type: 'request-start',
        content: 'تمام، رح أضيف المهمة...', // "Okay, I'll add the task..."
      },
    ],
  },
  {
    type: 'function',
    function: {
      name: 'get_team_members',
      description:
        'Get team member information. Use when user asks about the team or who is working on something.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    async: true,
  },
  {
    type: 'function',
    function: {
      name: 'get_schedule',
      description:
        'Get meetings and calendar events. Use when user asks about schedule, meetings, or availability.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Date to check (ISO format or "today", "tomorrow", "this week")',
          },
        },
        required: [],
      },
    },
    async: true,
    messages: [
      {
        type: 'request-start',
        content: 'خليني أشوف الجدول...', // "Let me check the schedule..."
      },
    ],
  },
  {
    type: 'function',
    function: {
      name: 'search_knowledge_base',
      description:
        'Search company documents, processes, and knowledge base. Use when user asks about how to do something, company policies, or any information that might be documented.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to find relevant documents',
          },
        },
        required: ['query'],
      },
    },
    async: true,
    messages: [
      {
        type: 'request-start',
        content: 'خليني أبحث في قاعدة المعرفة...', // "Let me search the knowledge base..."
      },
    ],
  },
  {
    type: 'function',
    function: {
      name: 'get_client_info',
      description:
        'Get client or lead information. Use when user asks about clients, leads, or customer details.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Client name to search for',
          },
          status: {
            type: 'string',
            enum: ['active_client', 'inactive_client', 'hot', 'cold', 'dropped'],
            description: 'Filter by lead status',
          },
        },
        required: [],
      },
    },
    async: true,
    messages: [
      {
        type: 'request-start',
        content: 'خليني أشوف معلومات العميل...',
      },
    ],
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description:
        'Search the web for any information. Use when user asks about general topics, news, research, or anything not in the knowledge base.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
        },
        required: ['query'],
      },
    },
    async: true,
    messages: [
      {
        type: 'request-start',
        content: 'خليني أبحث على النت...',
      },
    ],
  },
  {
    type: 'function',
    function: {
      name: 'update_issue',
      description:
        'Update an existing issue/task. Use when user wants to change status, priority, or assignee of a task.',
      parameters: {
        type: 'object',
        properties: {
          issueId: {
            type: 'string',
            description: 'ID of the issue to update',
          },
          status: {
            type: 'string',
            enum: ['Yet to Start', 'Todo', 'In Progress', 'Done', 'Canceled'],
            description: 'New status for the issue',
          },
          priority: {
            type: 'string',
            enum: ['Urgent', 'High', 'Medium', 'Low', 'No Priority'],
            description: 'New priority for the issue',
          },
          assigneeId: {
            type: 'string',
            description: 'ID of the team member to assign',
          },
        },
        required: ['issueId'],
      },
    },
    async: true,
    messages: [
      {
        type: 'request-start',
        content: 'طيب، رح أحدث المهمة...',
      },
    ],
  },
  {
    type: 'function',
    function: {
      name: 'create_meeting',
      description:
        'Schedule a new meeting. Use when user wants to set up a meeting with team members or clients.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Title of the meeting',
          },
          startTime: {
            type: 'string',
            description: 'Start time (e.g., "today at 3pm", "tomorrow 10:00", or ISO format)',
          },
          endTime: {
            type: 'string',
            description: 'End time (optional, defaults to 1 hour after start)',
          },
          description: {
            type: 'string',
            description: 'Meeting description or agenda',
          },
          clientId: {
            type: 'string',
            description: 'ID of the client if meeting is with a client',
          },
          projectId: {
            type: 'string',
            description: 'ID of the related project',
          },
        },
        required: ['title', 'startTime'],
      },
    },
    async: true,
    messages: [
      {
        type: 'request-start',
        content: 'تمام، رح أحدد الاجتماع...',
      },
    ],
  },
  {
    type: 'function',
    function: {
      name: 'send_notification',
      description:
        'Send a notification or message to team members. Use when user wants to notify someone or send a message.',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The notification message',
          },
          recipientName: {
            type: 'string',
            description: 'Name of the recipient (e.g., "Fawzi", "Moayad")',
          },
          type: {
            type: 'string',
            enum: ['general', 'urgent', 'reminder', 'update'],
            description: 'Type of notification',
          },
        },
        required: ['message'],
      },
    },
    async: true,
    messages: [
      {
        type: 'request-start',
        content: 'طيب، رح أبعث الرسالة...',
      },
    ],
  },
];

export function QualiaVoice({ isOpen, onClose, user }: QualiaVoiceProps) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [assistantMessage, setAssistantMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);

  const vapiRef = useRef<Vapi | null>(null);

  // Initialize VAPI
  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      setError('VAPI not configured');
      return;
    }

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    // Event listeners
    vapi.on('call-start', () => {
      setCallState('connected');
      setError(null);
    });

    vapi.on('call-end', () => {
      setCallState('idle');
      setTranscript('');
      setAssistantMessage('');
    });

    vapi.on('speech-start', () => {
      setCallState('speaking');
    });

    vapi.on('speech-end', () => {
      setCallState('listening');
    });

    vapi.on('volume-level', (volume: number) => {
      setVolumeLevel(volume);
    });

    vapi.on('message', (message: { type: string; role?: string; transcript?: string }) => {
      if (message.type === 'transcript') {
        if (message.role === 'user') {
          setTranscript(message.transcript || '');
        } else if (message.role === 'assistant') {
          setAssistantMessage(message.transcript || '');
        }
      }
    });

    vapi.on('error', (e: Error) => {
      console.error('VAPI error:', e);
      setError(e.message || 'Call error');
      setCallState('idle');
    });

    return () => {
      vapi.stop();
    };
  }, []);

  // Start call
  const startCall = useCallback(async () => {
    if (!vapiRef.current) {
      setError('VAPI not initialized');
      return;
    }

    setCallState('connecting');
    setError(null);
    setTranscript('');
    setAssistantMessage('');

    try {
      // Start with inline assistant config or use assistant ID
      const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

      if (assistantId) {
        // Pass user context as metadata when using assistant ID
        await vapiRef.current.start(assistantId, {
          metadata: user
            ? {
                userId: user.id,
                userName: user.name,
                workspaceId: user.workspaceId,
              }
            : undefined,
        });
      } else {
        // Personalized greeting based on user
        const firstName = user?.name?.split(' ')[0];
        const firstMessage = firstName
          ? `أهلين ${firstName}! شو بقدر أساعدك؟`
          : 'أهلين! شو بقدر أساعدك؟';

        // Inline assistant configuration with comprehensive Qualia personality
        await vapiRef.current.start({
          name: 'Qualia Voice Assistant',
          model: {
            provider: 'openai',
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: getSystemPrompt(user?.name),
              },
            ],
            tools: QUALIA_TOOLS,
          },
          voice: {
            provider: '11labs',
            voiceId: '4wf10lgibMnboGJGCLrP', // Custom Qualia voice
            model: 'eleven_multilingual_v2', // Multilingual model for Arabic support
            stability: 0.6, // Slightly higher for clearer speech
            similarityBoost: 0.8, // Keep voice characteristics
            speed: 0.9, // Slightly slower for clarity
          },
          firstMessage,
          firstMessageMode: 'assistant-speaks-first',
          transcriber: {
            provider: 'deepgram',
            model: 'nova-2',
            language: 'multi', // Multi-language for Arabic + English
            smartFormat: true,
            // Keywords to boost recognition accuracy
            keywords: [
              // Company & Team (English)
              'Qualia:5',
              'Fawzi:5',
              'Moayad:5',
              // Company & Team (Arabic)
              'كواليا:5',
              'فوزي:5',
              'مؤيد:5',
              // Tech terms
              'Supabase:4',
              'Vercel:4',
              'Next.js:4',
              'project:4',
              'deadline:4',
              'issue:4',
              'meeting:4',
              // Arabic common words
              'مشروع:4',
              'مهمة:4',
              'اجتماع:4',
              'عميل:4',
              'فريق:4',
            ],
          },
          // Server configuration for tool execution with user context
          server: process.env.NEXT_PUBLIC_APP_URL
            ? {
                url: `${process.env.NEXT_PUBLIC_APP_URL}/api/vapi/webhook`,
                timeoutSeconds: 20,
              }
            : undefined,
          // Pass user metadata for the webhook
          metadata: user
            ? {
                userId: user.id,
                userName: user.name,
                workspaceId: user.workspaceId,
              }
            : undefined,
        });
      }
    } catch (err) {
      console.error('Failed to start call:', err);
      setError('Failed to start call');
      setCallState('idle');
    }
  }, [user]);

  // End call
  const endCall = useCallback(() => {
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
    setCallState('idle');
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (vapiRef.current) {
      const newMuted = !isMuted;
      vapiRef.current.setMuted(newMuted);
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  // Handle close
  const handleClose = useCallback(() => {
    endCall();
    onClose();
  }, [endCall, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const isInCall = callState !== 'idle' && callState !== 'connecting';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Main content */}
      <div className="flex flex-col items-center">
        {/* Qualia avatar with state indicator */}
        <div className="relative mb-8">
          {/* Volume/pulse rings - Qualia teal theme */}
          {isInCall && (
            <>
              <div
                className={cn(
                  'absolute -inset-4 rounded-full transition-all duration-300',
                  callState === 'speaking' && 'bg-qualia-500/30',
                  callState === 'listening' && 'bg-qualia-400/20'
                )}
                style={{
                  transform: `scale(${1 + volumeLevel * 0.3})`,
                  opacity: 0.5 + volumeLevel * 0.5,
                }}
              />
              <div
                className={cn(
                  'absolute -inset-8 rounded-full transition-all duration-500',
                  callState === 'speaking' && 'bg-qualia-500/20',
                  callState === 'listening' && 'bg-qualia-400/10'
                )}
                style={{
                  transform: `scale(${1 + volumeLevel * 0.2})`,
                  opacity: 0.3 + volumeLevel * 0.3,
                }}
              />
              <div
                className={cn(
                  'absolute -inset-12 rounded-full transition-all duration-700',
                  callState === 'speaking' && 'bg-qualia-500/10',
                  callState === 'listening' && 'bg-qualia-400/5'
                )}
                style={{
                  transform: `scale(${1 + volumeLevel * 0.15})`,
                  opacity: 0.2 + volumeLevel * 0.2,
                }}
              />
            </>
          )}

          {/* Connecting animation */}
          {callState === 'connecting' && (
            <>
              <div className="absolute -inset-4 animate-ping rounded-full bg-qualia-500/30" />
              <div className="absolute -inset-8 animate-ping rounded-full bg-qualia-500/20 [animation-delay:150ms]" />
              <div className="absolute -inset-12 animate-ping rounded-full bg-qualia-500/10 [animation-delay:300ms]" />
            </>
          )}

          {/* Avatar */}
          <div
            className={cn(
              'relative flex h-32 w-32 items-center justify-center rounded-full border-2 transition-all duration-300',
              callState === 'idle' && 'border-border bg-card',
              callState === 'connecting' && 'border-qualia-500 bg-qualia-500/10',
              callState === 'connected' && 'border-qualia-500 bg-qualia-500/10',
              callState === 'listening' && 'border-qualia-400 bg-qualia-500/10',
              callState === 'speaking' && 'border-qualia-300 bg-qualia-500/20'
            )}
          >
            <Image src="/logo.webp" alt="Qualia" width={80} height={80} className="rounded-2xl" />
          </div>
        </div>

        {/* Status text */}
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            {callState === 'idle' && 'Call Qualia'}
            {callState === 'connecting' && 'Connecting...'}
            {callState === 'connected' && 'Connected'}
            {callState === 'listening' && 'Listening...'}
            {callState === 'speaking' && 'Qualia is speaking...'}
          </h2>

          {/* Transcript / Response */}
          <div className="max-w-md space-y-2">
            {transcript && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">You:</span> &ldquo;{transcript}&rdquo;
              </p>
            )}
            {assistantMessage && (
              <p className="text-sm text-qualia-400">
                <span className="font-medium text-qualia-300">Qualia:</span> &ldquo;
                {assistantMessage.slice(0, 200)}
                {assistantMessage.length > 200 ? '...' : ''}&rdquo;
              </p>
            )}
            {callState === 'idle' && !error && (
              <p className="text-sm text-muted-foreground">Tap the button to start a voice call</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Mute button - only show during call */}
          {isInCall && (
            <button
              onClick={toggleMute}
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full transition-all',
                isMuted
                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
              )}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          )}

          {/* Main call button */}
          <button
            onClick={isInCall ? endCall : startCall}
            disabled={callState === 'connecting'}
            className={cn(
              'flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition-all',
              callState === 'idle' &&
                'bg-qualia-500 text-white hover:scale-105 hover:bg-qualia-600',
              callState === 'connecting' &&
                'animate-pulse cursor-not-allowed bg-qualia-500/70 text-white',
              isInCall && 'bg-red-500 text-white hover:scale-105 hover:bg-red-600'
            )}
          >
            {isInCall ? <PhoneOff className="h-7 w-7" /> : <Phone className="h-7 w-7" />}
          </button>

          {/* Placeholder for symmetry when not in call */}
          {!isInCall && <div className="h-12 w-12" />}
        </div>

        {/* Call duration or hint */}
        <p className="mt-8 text-xs text-muted-foreground">
          {isInCall ? (
            'Tap the red button to end the call'
          ) : (
            <>
              Press{' '}
              <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5">Esc</kbd> to
              close
            </>
          )}
        </p>
      </div>
    </div>
  );
}
