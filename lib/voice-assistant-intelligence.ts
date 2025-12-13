/**
 * Voice Assistant Intelligence Module
 * Provides time-aware greetings, dynamic phrasing, and Jordanian conversational style
 */

import { getHours } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Time zones for Cyprus and Jordan
const TIMEZONES = {
  cyprus: 'Europe/Nicosia',
  jordan: 'Asia/Amman',
};

// User context for personalization
export interface UserContext {
  name?: string;
  role?: string;
  location?: 'cyprus' | 'jordan';
  lastInteraction?: Date;
  preferences?: {
    language?: 'arabic' | 'english' | 'mixed';
    formality?: 'formal' | 'casual';
  };
}

// Time-aware greeting variations in Jordanian Arabic
const GREETING_VARIATIONS = {
  earlyMorning: [
    // 4 AM - 6 AM
    'صباح الخير المبكر! شو أخبارك؟',
    'أهلين! صحيت بكير اليوم، إن شاء الله بخير',
    'صباح النور! يلا نبدأ يومنا بنشاط',
    'هلا والله! شايف إنك نشيط من الصبح',
  ],
  morning: [
    // 6 AM - 11 AM
    'صباح الخير! كيف حالك اليوم؟',
    'صباح النور والسرور! شو الأخبار؟',
    'أهلين! صباحك سعيد، كيفك؟',
    'هلا والله! إن شاء الله يومك حلو',
    'صباح الفل! شو بدك نساعدك فيه اليوم؟',
  ],
  noon: [
    // 11 AM - 2 PM
    'أهلين! كيف حالك؟ إن شاء الله تمام',
    'هلا! شو الأخبار؟',
    'مرحبا! كيف يومك ماشي؟',
    'أهلا وسهلا! شو بقدر أساعدك؟',
  ],
  afternoon: [
    // 2 PM - 5 PM
    'مساء الخير! كيف حالك؟',
    'أهلين! إن شاء الله يومك كان منيح',
    'هلا! شو صار معك اليوم؟',
    'مرحبا! كيف الشغل ماشي؟',
  ],
  evening: [
    // 5 PM - 8 PM
    'مساء الخير! كيف كان يومك؟',
    'مساء النور! إن شاء الله يومك كان حلو',
    'أهلين! يعطيك العافية على شغلك اليوم',
    'هلا والله! شو أخبار اليوم؟',
  ],
  night: [
    // 8 PM - 11 PM
    'مساء الخير! لسا شغال؟',
    'أهلين! يعطيك العافية',
    'هلا! إن شاء الله ما تعبت اليوم',
    'مساء النور! شو بقدر أساعدك قبل ما تخلص؟',
  ],
  lateNight: [
    // 11 PM - 4 AM
    'أهلين! لسا صاحي؟',
    'هلا! شو اللي مسهرك؟',
    'مساء الخير! في شي مستعجل؟',
    'أهلا! إن شاء الله كلشي تمام',
  ],
};

// Dynamic phrase variations for common responses
const DYNAMIC_PHRASES = {
  understood: ['تمام، فهمت عليك', 'ماشي، واضح', 'أوكي، حاضر', 'طيب، فهمت القصة', 'آه صح، تمام'],
  working: [
    'دقيقة، خليني أشوف',
    'لحظة، رح أتحقق',
    'ثانية، بس أشوف',
    'خليني أدور عالمعلومة',
    'رح أجيبلك التفاصيل حالاً',
  ],
  completed: [
    'خلص، تم الموضوع',
    'تمام، انعمل',
    'جاهز، خلصت',
    'انتهينا، كلشي تمام',
    'ممتاز، تم بنجاح',
  ],
  error: [
    'في مشكلة صغيرة، خليني أحاول مرة ثانية',
    'ما زبط معي، بس ثانية',
    'صار في خطأ، رح أجرب طريقة ثانية',
    'للأسف ما زبطت، خليني أشوف شو المشكلة',
  ],
  thinking: ['خليني أفكر شوي', 'لحظة بس أحلل الموضوع', 'هممم، خليني أشوف', 'دقيقة أرتب أفكاري'],
  help: [
    'أكيد، رح أساعدك',
    'طبعاً، تحت أمرك',
    'بالتأكيد، خلينا نشوف',
    'لا تقلق، رح نحل الموضوع',
    'ما في مشكلة، بساعدك',
  ],
  thanks: [
    'العفو، هاد شغلي',
    'ولا يهمك',
    'تحت أمرك دايماً',
    'الله يعطيك العافية',
    'دايماً بالخدمة',
  ],
  goodbye: [
    'يلا، الله معك',
    'باي، نشوفك قريب',
    'سلام، بالتوفيق',
    'الله يعطيك العافية',
    'مع السلامة، خلي بالك على حالك',
  ],
};

// Personalized responses based on user
const PERSONALIZED_RESPONSES = {
  fawzi: {
    greeting: 'أهلا فوزي! شو أخبار المشاريع؟',
    help: 'أكيد فوزي، شو بدك نعمل؟',
    projectUpdate: 'خليني أجيبلك آخر تحديثات المشاريع',
    urgent: 'في إشي urgent لازم تشوفه',
  },
  moayad: {
    greeting: 'هلا مؤيد! كيف العملاء؟',
    help: 'طبعاً مؤيد، شو اللي بدك تتعلمه اليوم؟',
    explanation: 'خليني أشرحلك بالتفصيل',
    encouragement: 'ممتاز! عم تتطور بسرعة',
  },
};

/**
 * Get time period based on hour
 */
function getTimePeriod(hour: number): keyof typeof GREETING_VARIATIONS {
  if (hour >= 4 && hour < 6) return 'earlyMorning';
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  if (hour >= 20 && hour < 23) return 'night';
  return 'lateNight';
}

/**
 * Get random item from array
 */
function getRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Generate time-aware greeting based on user context and current time
 */
export function generateGreeting(userContext?: UserContext): string {
  // Determine timezone based on user location
  const timezone = userContext?.location === 'cyprus' ? TIMEZONES.cyprus : TIMEZONES.jordan;
  const now = toZonedTime(new Date(), timezone);
  const hour = getHours(now);
  const timePeriod = getTimePeriod(hour);

  // Check for personalized greeting
  const firstName = userContext?.name?.split(' ')[0]?.toLowerCase();
  if (firstName === 'fawzi' && Math.random() > 0.3) {
    return PERSONALIZED_RESPONSES.fawzi.greeting;
  }
  if (firstName === 'moayad' && Math.random() > 0.3) {
    return PERSONALIZED_RESPONSES.moayad.greeting;
  }

  // Get random greeting for time period
  let greeting = getRandomItem(GREETING_VARIATIONS[timePeriod]);

  // Personalize with name if available
  if (firstName && userContext?.name && Math.random() > 0.5) {
    greeting = greeting.replace('!', ` ${userContext.name.split(' ')[0]}!`);
  }

  // Add day-specific touches
  const dayOfWeek = now.getDay();
  if (dayOfWeek === 0 && Math.random() > 0.7) {
    // Sunday - start of work week
    greeting += ' يلا نبدأ أسبوع جديد بنشاط!';
  } else if (dayOfWeek === 4 && Math.random() > 0.7) {
    // Thursday - end of work week
    greeting += ' قربنا نخلص الأسبوع!';
  }

  return greeting;
}

/**
 * Get dynamic phrase for a specific context
 */
export function getDynamicPhrase(
  context: keyof typeof DYNAMIC_PHRASES,
  userContext?: UserContext
): string {
  const phrases = DYNAMIC_PHRASES[context];
  if (!phrases) return '';

  // Check for personalized responses
  const firstName = userContext?.name?.split(' ')[0]?.toLowerCase();
  if (firstName === 'fawzi' && context === 'help') {
    return PERSONALIZED_RESPONSES.fawzi.help;
  }
  if (firstName === 'moayad' && context === 'help') {
    return PERSONALIZED_RESPONSES.moayad.help;
  }

  return getRandomItem(phrases);
}

/**
 * Generate contextual response based on intent
 */
export function generateContextualResponse(
  intent: string,
  data?: any,
  userContext?: UserContext
): string {
  const firstName = userContext?.name?.split(' ')[0];

  switch (intent) {
    case 'project_status':
      const variations = [
        `المشروع "${data.name}" حالياً ${data.status}`,
        `شوف، "${data.name}" وضعه ${data.status}`,
        `بالنسبة لـ"${data.name}"، هو ${data.status}`,
      ];
      return getRandomItem(variations);

    case 'task_created':
      return getRandomItem([
        `تمام، ضفت المهمة "${data.title}" على البورد`,
        `خلص، المهمة "${data.title}" انضافت`,
        `ممتاز، حطيت "${data.title}" بالمهام`,
      ]);

    case 'meeting_scheduled':
      return getRandomItem([
        `حددت الاجتماع يوم ${data.date} الساعة ${data.time}`,
        `تمام، الاجتماع محدد ${data.date} على ${data.time}`,
        `جاهز، Meeting يوم ${data.date} الساعة ${data.time}`,
      ]);

    case 'no_results':
      return getRandomItem([
        'ما لقيت نتائج، جرب تبحث بطريقة ثانية',
        'للأسف ما في نتائج، ممكن تعطيني تفاصيل أكثر؟',
        'ما طلع معي إشي، خلينا نجرب بحث ثاني',
      ]);

    case 'encouragement':
      if (firstName === 'moayad') {
        return getRandomItem([
          'ممتاز مؤيد! عم تتعلم بسرعة',
          'برافو! شايف إنك فاهم الموضوع',
          'كثير منيح! استمر',
        ]);
      }
      return getRandomItem(['ممتاز! عمل رائع', 'برافو عليك!', 'كثير منيح، استمر']);

    default:
      return getDynamicPhrase('understood', userContext);
  }
}

/**
 * Add conversational fillers and transitions
 */
export function addConversationalFillers(text: string): string {
  const fillers = ['يعني', 'شوف', 'بصراحة', 'المهم', 'خلينا نقول'];
  const transitions = ['بس', 'و', 'كمان', 'على فكرة', 'بالمناسبة'];

  // Randomly add fillers (30% chance)
  if (Math.random() > 0.7) {
    const filler = getRandomItem(fillers);
    text = `${filler}، ${text}`;
  }

  // Add transitions between sentences
  const sentences = text.split('. ');
  if (sentences.length > 1 && Math.random() > 0.6) {
    const transition = getRandomItem(transitions);
    sentences[1] = `${transition} ${sentences[1]}`;
    text = sentences.join('. ');
  }

  return text;
}

/**
 * Generate follow-up questions to maintain conversation
 */
export function generateFollowUp(context: string): string {
  const followUps: Record<string, string[]> = {
    project: ['بدك تشوف التفاصيل؟', 'في إشي ثاني عن المشروع؟', 'بدك أجيبلك المهام المتعلقة؟'],
    task: ['بدك تعين حدا عليها؟', 'شو الـ priority؟', 'متى الـ deadline؟'],
    meeting: ['بدك أبعث دعوات للحضور؟', 'بدي أضيف agenda؟', 'أحجز قاعة؟'],
    general: ['في إشي ثاني بقدر أساعدك فيه؟', 'بدك شي ثاني؟', 'كمان إشي؟'],
  };

  const questions = followUps[context] || followUps.general;
  return getRandomItem(questions);
}

/**
 * Adapt formality based on context
 */
export function adaptFormality(text: string, userContext?: UserContext): string {
  if (userContext?.preferences?.formality === 'formal') {
    // Replace casual words with formal ones
    text = text.replace(/شو/g, 'ما');
    text = text.replace(/يلا/g, 'هيا');
    text = text.replace(/هلا/g, 'أهلاً');
    text = text.replace(/ماشي/g, 'حسناً');
  }
  return text;
}

/**
 * Mix English technical terms naturally
 */
export function mixTechnicalTerms(text: string): string {
  const technicalMappings: Record<string, string[]> = {
    مشروع: ['project', 'المشروع'],
    مهمة: ['task', 'المهمة'],
    اجتماع: ['meeting', 'الاجتماع'],
    موعد: ['deadline', 'الموعد'],
    عميل: ['client', 'العميل'],
    فريق: ['team', 'الفريق'],
  };

  // Randomly replace Arabic terms with English (40% chance)
  for (const [arabic, options] of Object.entries(technicalMappings)) {
    if (text.includes(arabic) && Math.random() > 0.6) {
      const replacement = getRandomItem(options);
      text = text.replace(new RegExp(arabic, 'g'), replacement);
    }
  }

  return text;
}

/**
 * Generate complete intelligent response
 */
export function generateIntelligentResponse(
  intent: string,
  data?: any,
  userContext?: UserContext
): string {
  // Generate base response
  let response = generateContextualResponse(intent, data, userContext);

  // Add conversational elements
  response = addConversationalFillers(response);

  // Mix technical terms
  response = mixTechnicalTerms(response);

  // Adapt formality
  response = adaptFormality(response, userContext);

  // Add follow-up question (50% chance)
  if (Math.random() > 0.5) {
    const followUp = generateFollowUp(intent.split('_')[0]);
    response = `${response} ${followUp}`;
  }

  return response;
}

/**
 * Check if response needs Arabic numerals conversion
 */
export function convertToArabicNumerals(text: string): string {
  const arabicNumerals: Record<string, string> = {
    '0': '٠',
    '1': '١',
    '2': '٢',
    '3': '٣',
    '4': '٤',
    '5': '٥',
    '6': '٦',
    '7': '٧',
    '8': '٨',
    '9': '٩',
  };

  // Only convert in fully Arabic contexts
  if (!/[a-zA-Z]/.test(text)) {
    for (const [eng, ar] of Object.entries(arabicNumerals)) {
      text = text.replace(new RegExp(eng, 'g'), ar);
    }
  }

  return text;
}

/**
 * Generate system prompt with enhanced intelligence
 */
export function generateEnhancedSystemPrompt(userContext?: UserContext): string {
  const greeting = generateGreeting(userContext);
  const firstName = userContext?.name?.split(' ')[0];

  return `إنتي كواليا — المساعد الصوتي الذكي لشركة كواليا سولوشنز.

## تعليمات الذكاء المحسّن

### 1. التحية الذكية
- استخدمي التحية المناسبة للوقت: "${greeting}"
- غيري التحية كل مرة عشان ما تكرري نفسك
- انتبهي للوقت (صباح/مساء) واليوم (بداية/نهاية الأسبوع)

### 2. التنويع في الردود
- لا تستخدمي نفس الجملة مرتين متتاليتين
- نوّعي في طريقة الرد حتى لنفس السؤال
- استخدمي مرادفات وتعابير مختلفة

### 3. الشخصية الأردنية
- احكي زي الأردنية الشاطرة بالشغل
- استخدمي تعابير أردنية طبيعية
- امزجي المصطلحات التقنية بالإنجليزي بشكل سلس
- كوني ودودة بس مهنية

### 4. الذكاء السياقي
${firstName === 'fawzi' ? '- مع فوزي: كوني مباشرة وتقنية، ركزي على الكفاءة' : ''}
${firstName === 'moayad' ? '- مع مؤيد: اشرحي بوضوح، شجعي التعلم، كوني صبورة' : ''}
- تذكري السياق من المحادثة
- اسألي أسئلة متابعة ذكية
- اقترحي خطوات تالية منطقية

### 5. أمثلة على التنويع

بدل "تمام" استخدمي:
- "ماشي الحال"
- "أوكي حاضر"
- "تحت أمرك"
- "ما في مشكلة"

بدل "خليني أشوف" استخدمي:
- "دقيقة أتحقق"
- "لحظة بس"
- "ثانية أدور"
- "رح أجيبلك المعلومة"

### 6. التفاعل الطبيعي
- أظهري ردود فعل: "واو!"، "ممتاز!"، "يعطيك العافية!"
- استخدمي الدعابة الخفيفة عند المناسبة
- أظهري التعاطف: "فاهمة عليك"، "معك حق"
- كوني استباقية: "كمان ممكن يفيدك..."

تذكري: الهدف إنك تكوني مساعدة ذكية وطبيعية، مش روبوت!`;
}
