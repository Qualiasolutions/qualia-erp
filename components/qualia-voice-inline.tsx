'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { PhoneOff, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import Vapi from '@vapi-ai/web';

interface QualiaVoiceInlineProps {
  // User context for personalization
  user?: {
    id: string;
    name: string;
    email: string;
    workspaceId?: string;
  };
  // Auto-greeting support
  autoGreet?: boolean;
  autoGreetingMessage?: string | null;
  onAutoGreetComplete?: () => void;
  greetingContext?:
    | {
        reminders: Array<{
          type: string;
          priority: 'critical' | 'high' | 'medium' | 'low';
          message: string;
          details?: Record<string, unknown>;
          count?: number;
        }>;
        motivationalMessages: string[];
        specialOccasions: Array<{
          type: string;
          message: string;
        }>;
        stats: {
          todayMeetingsCount: number;
          urgentTasksCount: number;
          overdueTasksCount: number;
          completedTasksCount: number;
        };
      }
    | undefined; // Additional context for the voice assistant
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
        content: 'دقيقة، خليني أشوف المشاريع...',
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
        content: 'خليني أشوف المهام...',
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
        content: 'تمام، رح أضيف المهمة...',
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
        content: 'خليني أشوف الجدول...',
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
        content: 'خليني أبحث في قاعدة المعرفة...',
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

export function QualiaVoiceInline({
  user,
  autoGreet,
  autoGreetingMessage,
  onAutoGreetComplete,
  greetingContext,
}: QualiaVoiceInlineProps) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [assistantMessage, setAssistantMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [hasAutoGreeted, setHasAutoGreeted] = useState(false);

  const vapiRef = useRef<Vapi | null>(null);
  const autoGreetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize VAPI
  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      setError('VAPI not configured');
      return;
    }

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

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

    vapi.on('error', (e: { type?: string; message?: string }) => {
      console.error('VAPI error:', e);

      // Handle specific errors
      if (e.type === 'device-error') {
        setError('Microphone not found. Please check your microphone permissions.');
      } else if (e.type === 'permission-error') {
        setError('Microphone permission denied. Please allow microphone access.');
      } else if (e.type === 'daily-error' || e.message?.includes('Meeting has ended')) {
        // Don't show error for daily meeting errors (normal cleanup)
        setCallState('idle');
        return;
      } else {
        setError(e.message || 'Call error');
      }

      setCallState('idle');
    });

    return () => {
      vapi.stop();
    };
  }, []);

  // Start call immediately
  const startCall = useCallback(
    async (customMessage?: string | null) => {
      if (!vapiRef.current) {
        setError('VAPI not initialized');
        return;
      }

      // Try to request microphone permissions first (only for manual calls, not auto-greeting)
      if (!customMessage) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
        } catch (error: { name: string }) {
          if (error.name === 'NotAllowedError') {
            setError('Microphone permission denied. Please allow microphone access.');
            return;
          } else if (error.name === 'NotFoundError') {
            setError('No microphone found. Please connect a microphone.');
            return;
          }
        }
      }

      setCallState('connecting');
      setError(null);
      setTranscript('');
      setAssistantMessage('');

      try {
        const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
        // Check if assistantId is a valid UUID (not empty, not placeholder)
        const isValidUUID =
          assistantId &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assistantId);

        if (isValidUUID) {
          // Pass user context as metadata when using assistant ID
          await vapiRef.current.start(assistantId, {
            metadata: user
              ? {
                  userId: user.id,
                  userName: user.name,
                  workspaceId: user.workspaceId,
                  greetingContext: greetingContext,
                }
              : undefined,
          });
        } else {
          // Personalized greeting based on user or custom message
          const firstName = user?.name?.split(' ')[0];
          const firstMessage =
            customMessage ||
            (firstName ? `أهلين ${firstName}! شو بقدر أساعدك؟` : 'أهلين! شو بقدر أساعدك؟');

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
                'Nextjs:4',
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
            // Server configuration for tool execution
            server: process.env.NEXT_PUBLIC_APP_URL
              ? {
                  url: `${process.env.NEXT_PUBLIC_APP_URL.replace(/\s+/g, '')}/api/vapi/webhook`,
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
    },
    [user, greetingContext]
  );

  const endCall = useCallback(() => {
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
    setCallState('idle');
  }, []);

  const toggleMute = useCallback(() => {
    if (vapiRef.current) {
      const newMuted = !isMuted;
      vapiRef.current.setMuted(newMuted);
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  const isInCall = callState !== 'idle' && callState !== 'connecting';

  // Handle auto-greeting with user interaction requirement
  useEffect(() => {
    if (autoGreet && !hasAutoGreeted && vapiRef.current && autoGreetingMessage) {
      // Clear any existing timeout
      const currentTimeout = autoGreetTimeoutRef.current;
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }

      // Wait for user interaction before starting auto-greeting
      const handleUserInteraction = async () => {
        // Remove event listener after first interaction
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);

        // Small delay to ensure VAPI is ready
        await new Promise((resolve) => setTimeout(resolve, 500));

        try {
          setHasAutoGreeted(true);
          await startCall(autoGreetingMessage);

          // Auto-end the call after the message is spoken
          setTimeout(() => {
            endCall();
            if (onAutoGreetComplete) {
              onAutoGreetComplete();
            }
          }, 15000);
        } catch (error) {
          console.error('Auto-greeting failed:', error);
          // Don't show error to user for auto-greeting failures
        }
      };

      // Add event listeners for user interaction
      document.addEventListener('click', handleUserInteraction, { once: true });
      document.addEventListener('keydown', handleUserInteraction, { once: true });
      document.addEventListener('touchstart', handleUserInteraction, { once: true });

      return () => {
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
        if (currentTimeout) {
          clearTimeout(currentTimeout);
        }
      };
    }
  }, [autoGreet, hasAutoGreeted, autoGreetingMessage, startCall, endCall, onAutoGreetComplete]);

  return (
    <div className="flex flex-col items-center">
      {/* Qualia Avatar with call button integrated */}
      <div className="relative mb-4">
        {/* Volume rings when in call */}
        {isInCall && (
          <>
            <div
              className={cn(
                'absolute -inset-3 rounded-full transition-all duration-300',
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
                'absolute -inset-6 rounded-full transition-all duration-500',
                callState === 'speaking' && 'bg-qualia-500/20',
                callState === 'listening' && 'bg-qualia-400/10'
              )}
              style={{
                transform: `scale(${1 + volumeLevel * 0.2})`,
                opacity: 0.3 + volumeLevel * 0.3,
              }}
            />
          </>
        )}

        {/* Connecting animation */}
        {callState === 'connecting' && (
          <>
            <div className="absolute -inset-3 animate-ping rounded-full bg-qualia-500/30" />
            <div className="absolute -inset-6 animate-ping rounded-full bg-qualia-500/20 [animation-delay:150ms]" />
          </>
        )}

        {/* Main button - Logo that starts/ends call */}
        <button
          onClick={isInCall ? endCall : () => startCall()}
          disabled={callState === 'connecting'}
          className={cn(
            'group relative rounded-3xl p-2 transition-all',
            callState === 'idle' && 'hover:bg-qualia-500/10',
            callState === 'connecting' && 'cursor-not-allowed',
            isInCall && 'bg-qualia-500/10'
          )}
        >
          <div className="relative">
            {/* Glow effect */}
            <div
              className={cn(
                'absolute -inset-2 rounded-full blur-xl transition-opacity duration-500',
                callState === 'idle' && 'bg-qualia-500/20 opacity-0 group-hover:opacity-100',
                callState === 'connecting' && 'animate-pulse bg-qualia-500/30 opacity-100',
                isInCall && 'bg-qualia-500/30 opacity-100'
              )}
            />
            <Image
              src="/logo.webp"
              alt="Qualia"
              width={80}
              height={80}
              className={cn(
                'relative rounded-2xl transition-transform duration-300',
                callState === 'idle' && 'group-hover:scale-105',
                isInCall && 'scale-105'
              )}
            />

            {/* Call indicator overlay */}
            {isInCall && (
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-lg">
                <PhoneOff className="h-3 w-3" />
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Status text */}
      <div className="text-center">
        <p
          className={cn(
            'text-xs font-medium transition-colors',
            callState === 'idle' && 'text-muted-foreground',
            callState === 'connecting' && 'animate-pulse text-qualia-500',
            callState === 'listening' && 'text-qualia-400',
            callState === 'speaking' && 'text-qualia-300'
          )}
        >
          {callState === 'idle' && 'Talk to Qualia'}
          {callState === 'connecting' && 'Connecting...'}
          {callState === 'listening' && 'Listening...'}
          {callState === 'speaking' && 'Speaking...'}
        </p>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>

      {/* Transcript display when in call */}
      {isInCall && (transcript || assistantMessage) && (
        <div className="mt-4 max-w-md space-y-1 text-center">
          {transcript && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">You:</span> &ldquo;{transcript}&rdquo;
            </p>
          )}
          {assistantMessage && (
            <p className="text-xs text-qualia-400">
              <span className="font-medium text-qualia-300">Qualia:</span> &ldquo;
              {assistantMessage.slice(0, 150)}
              {assistantMessage.length > 150 ? '...' : ''}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Error message */}
      {error && !isInCall && (
        <div className="mt-4 max-w-xs rounded-lg bg-red-500/10 px-3 py-2 text-center">
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      {/* Mute button when in call */}
      {isInCall && (
        <button
          onClick={toggleMute}
          className={cn(
            'mt-4 flex h-10 w-10 items-center justify-center rounded-full transition-all',
            isMuted
              ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
          )}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
      )}

      {/* Permission hint for auto-greeting */}
      {autoGreet && !hasAutoGreeted && !isInCall && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Click anywhere to activate voice assistant
        </p>
      )}
    </div>
  );
}
