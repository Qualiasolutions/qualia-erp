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

// Dynamic phrase variations for common responses - EXPANDED for maximum variety
const DYNAMIC_PHRASES = {
  understood: [
    'تمام، فهمت عليك',
    'ماشي، واضح',
    'أوكي، حاضر',
    'طيب، فهمت القصة',
    'آه صح، تمام',
    'واضح المطلوب',
    'got it، فاهم عليك',
    'مفهوم، مية المية',
    'طيب، clear',
    'تمام تمام، مضبوط',
    'حلو، فهمت',
    'أكيد، واصل الفكرة',
    'صح عليك، واضح',
    'ماشي الحال، فاهم',
  ],
  working: [
    'دقيقة، خليني أشوف',
    'لحظة، رح أتحقق',
    'ثانية، بس أشوف',
    'خليني أدور عالمعلومة',
    'رح أجيبلك التفاصيل حالاً',
    'لحظة، عم أتحقق',
    'بشوفلك الموضوع',
    'حاضر، خليني أبحث',
    'أوكي، بس ثانية',
    'ماشي، قيد البحث',
    'جاري الفحص',
    'بتحقق هلق',
    'خليني أشيك',
    'بلاقيلك الجواب',
    'عم أجمع المعلومات',
  ],
  completed: [
    'خلص، تم الموضوع',
    'تمام، انعمل',
    'جاهز، خلصت',
    'انتهينا، كلشي تمام',
    'ممتاز، تم بنجاح',
    'صار الموضوع',
    'done والله',
    'خلص، الحمدلله',
    'تمت المهمة',
    'اتعمل اللي طلبته',
    'خلص الشغل',
    'تم التنفيذ',
    'انجزنا الموضوع',
    'خلصنا، الله يبارك',
  ],
  error: [
    'في مشكلة صغيرة، خليني أحاول مرة ثانية',
    'ما زبط معي، بس ثانية',
    'صار في خطأ، رح أجرب طريقة ثانية',
    'للأسف ما زبطت، خليني أشوف شو المشكلة',
    'واجهت عقبة صغيرة',
    'في شي مش ماشي، بس أتحقق',
    'صار مشكل بسيط',
    'لحظة، في error صغير',
    'واجهنا موضوع، خليني أحله',
  ],
  thinking: [
    'خليني أفكر شوي',
    'لحظة بس أحلل الموضوع',
    'هممم، خليني أشوف',
    'دقيقة أرتب أفكاري',
    'عم أفكر بأفضل طريقة',
    'خليني أحسبها',
    'بفكر شو أنسب خيار',
    'أممم، عندي فكرة',
    'هممم، طيب',
  ],
  help: [
    'أكيد، رح أساعدك',
    'طبعاً، تحت أمرك',
    'بالتأكيد، خلينا نشوف',
    'لا تقلق، رح نحل الموضوع',
    'ما في مشكلة، بساعدك',
    'حاضر، شو بدك؟',
    'أكيد، شو المطلوب؟',
    'هلا، تفضل',
    'طبعاً، أنا هون',
    'مرحبا، كيف بساعدك؟',
    'عالراس والعين',
    'أكيد، شو بقدر أعمل؟',
  ],
  thanks: [
    'العفو، هاد شغلي',
    'ولا يهمك',
    'تحت أمرك دايماً',
    'الله يعطيك العافية',
    'دايماً بالخدمة',
    'ولا شكر على واجب',
    'أي خدمة',
    'موجودين للخدمة',
    'هاد واجبنا',
    'يا هلا',
  ],
  goodbye: [
    'يلا، الله معك',
    'باي، نشوفك قريب',
    'سلام، بالتوفيق',
    'الله يعطيك العافية',
    'مع السلامة، خلي بالك على حالك',
    'يلا مع السلامة',
    'باي باي، موفق',
    'الله معك',
    'سلامتك',
    'تمام، نتواصل',
    'أوكي، بالتوفيق',
    'يلا، قضيت أي شي طلبني',
  ],
  // NEW categories for more variety
  surprise: ['واو!', 'ممتاز!', 'حلو هيك!', 'كتير منيح!', 'رائع!', 'شي بجنن!', 'يا سلام!'],
  agreement: ['معك حق', 'صح كلامك', 'أكيد', 'بالظبط', 'هيك بالضبط', 'مزبوط', '100%', 'exactly'],
  encouragement: [
    'استمر!',
    'ماشي منيح!',
    'عم نتقدم!',
    'ممتاز، كمل!',
    'حلو، يلا!',
    'برافو!',
    'شاطر!',
  ],
  transition: ['طيب، المهم', 'على فكرة', 'بالمناسبة', 'كمان شي', 'وبعدين', 'إضافة لهيك', 'شي ثاني'],
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
 * Get dynamic phrase for a specific context - with anti-repetition
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

  // Use unique phrase selector to avoid repetition
  return getUniquePhrase(phrases);
}

/**
 * Generate contextual response based on intent - EXPANDED variations
 */
export function generateContextualResponse(
  intent: string,
  data?: any,
  userContext?: UserContext
): string {
  const firstName = userContext?.name?.split(' ')[0];

  switch (intent) {
    case 'project_status':
      return getUniquePhrase([
        `المشروع "${data.name}" حالياً ${data.status}`,
        `شوف، "${data.name}" وضعه ${data.status}`,
        `بالنسبة لـ"${data.name}"، هو ${data.status}`,
        `"${data.name}" الحالة: ${data.status}`,
        `عن "${data.name}"، الـ status هو ${data.status}`,
        `خليني أحكيلك عن "${data.name}" - ${data.status}`,
        `مشروع "${data.name}" ماشي ${data.status}`,
      ]);

    case 'task_created':
      return getUniquePhrase([
        `ضفت المهمة "${data.title}" على البورد`,
        `المهمة "${data.title}" انضافت`,
        `حطيت "${data.title}" بالمهام`,
        `"${data.title}" صارت على القائمة`,
        `تم إضافة "${data.title}"`,
        `"${data.title}" انحطت بالمهام`,
        `ضفنا "${data.title}" للقائمة`,
        `"${data.title}" موجودة هلق`,
        `سجلت "${data.title}" عالبورد`,
      ]);

    case 'meeting_scheduled':
      return getUniquePhrase([
        `حددت الاجتماع يوم ${data.date} الساعة ${data.time}`,
        `الاجتماع محدد ${data.date} على ${data.time}`,
        `Meeting يوم ${data.date} الساعة ${data.time}`,
        `جدولت الـ meeting: ${data.date} - ${data.time}`,
        `محجوز: ${data.date} الساعة ${data.time}`,
        `الموعد: ${data.date} على ${data.time}`,
        `سجلتلك اجتماع ${data.date} الـ ${data.time}`,
      ]);

    case 'no_results':
      return getUniquePhrase([
        'ما لقيت نتائج، جرب تبحث بطريقة ثانية',
        'للأسف ما في نتائج، ممكن تعطيني تفاصيل أكثر؟',
        'ما طلع معي إشي، خلينا نجرب بحث ثاني',
        'البحث ما رجّع نتائج، غيّر الكلمات وجرب',
        'ما لقيت شي، ممكن توضح أكثر؟',
        'صفر نتائج، شو رأيك نجرب بشكل ثاني؟',
        'ما طلع شي، حاول تعطيني معلومات أكثر',
        'للأسف فاضي، جرب بكلمات ثانية',
      ]);

    case 'encouragement':
      if (firstName?.toLowerCase() === 'moayad') {
        return getUniquePhrase([
          'ممتاز مؤيد! عم تتعلم بسرعة',
          'برافو! شايف إنك فاهم الموضوع',
          'كثير منيح! استمر',
          'يا سلام مؤيد! شاطر',
          'والله رهيب! كمّل هيك',
          'حلو! عم تتطور',
          'برافو مؤيد، ماشي منيح!',
        ]);
      }
      return getUniquePhrase([
        'ممتاز! عمل رائع',
        'برافو عليك!',
        'كثير منيح، استمر',
        'رهيب! كمّل هيك',
        'يا سلام! ممتاز',
        'حلو كثير!',
        'شاطر! استمر',
        'برافو، ماشي الحال!',
      ]);

    case 'project':
      return getUniquePhrase([
        'بدك تشوف التفاصيل؟',
        'بدي أعرض المهام المرتبطة؟',
        'شو رأيك نشوف الـ roadmap؟',
        'حابب تعرف مين شغال عليه؟',
        'في شي ثاني عن المشروع؟',
        'بدك تحدث شي؟',
      ]);

    case 'task':
      return getUniquePhrase([
        'بدك تعين حدا؟',
        'شو الأولوية؟',
        'متى الـ deadline؟',
        'بدك تضيف وصف؟',
        'حابب تربطها بمشروع؟',
        'في شي ثاني؟',
      ]);

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
 * Generate follow-up questions to maintain conversation - EXPANDED
 */
export function generateFollowUp(context: string): string {
  const followUps: Record<string, string[]> = {
    project: [
      'بدك تشوف التفاصيل؟',
      'في إشي ثاني عن المشروع؟',
      'بدك أجيبلك المهام المتعلقة؟',
      'بدك تشوف الـ roadmap؟',
      'في تحديثات بدك تعملها؟',
      'شو رأيك نشوف التقدم؟',
      'بدك أعرض عليك الفريق اللي شغال عليه؟',
      'حابب تشوف الـ timeline؟',
      'في شي بدك تضيفه؟',
    ],
    task: [
      'بدك تعين حدا عليها؟',
      'شو الـ priority؟',
      'متى الـ deadline؟',
      'بدك تربطها بمشروع؟',
      'في وصف بدك تضيفه؟',
      'بدي أضيف تعليق؟',
      'حابب تغير الـ status؟',
      'في مهام مرتبطة؟',
      'بدك تحط reminder؟',
    ],
    meeting: [
      'بدك أبعث دعوات للحضور؟',
      'بدي أضيف agenda؟',
      'أحجز قاعة؟',
      'بدك تضيف ملاحظات؟',
      'شو المدة المتوقعة؟',
      'في حدا معين لازم يحضر؟',
      'بدك أربطه بمشروع؟',
      'حابب تضيف عميل؟',
    ],
    client: [
      'بدك تشوف المشاريع المرتبطة فيه؟',
      'في اتصالات سابقة؟',
      'بدك تحدث الحالة؟',
      'شو آخر تواصل معه؟',
      'بدي أجدولك meeting معه؟',
      'في ملاحظات جديدة؟',
    ],
    schedule: [
      'بدك أضيف meeting جديد؟',
      'شو رأيك نشوف اجتماعات بكرا؟',
      'في شي محتاج تلغيه؟',
      'بدك تغير وقت اجتماع؟',
      'حابب تشوف الأسبوع كامل؟',
    ],
    general: [
      'في إشي ثاني بقدر أساعدك فيه؟',
      'بدك شي ثاني؟',
      'كمان إشي؟',
      'شو ثاني عبالك؟',
      'قضيت شي؟',
      'في شي ثاني؟',
      'أي خدمة ثانية؟',
      'شو كمان؟',
      'بدك نكمل؟',
      'في غيرو؟',
      'شي ثاني عبالك؟',
    ],
  };

  const questions = followUps[context] || followUps.general;
  return getRandomItem(questions);
}

/**
 * Track recently used phrases to avoid repetition within a session
 * Uses a simple ring buffer approach
 */
const recentlyUsedPhrases: string[] = [];
const MAX_RECENT_PHRASES = 20;

/**
 * Get a phrase while avoiding recent repetition
 */
function getUniquePhrase<T extends string>(phrases: T[]): T {
  // Filter out recently used phrases
  const available = phrases.filter((p) => !recentlyUsedPhrases.includes(p));

  // If all phrases were recently used, clear history and use all
  const selected = available.length > 0 ? getRandomItem(available) : getRandomItem(phrases);

  // Track this phrase
  recentlyUsedPhrases.push(selected);
  if (recentlyUsedPhrases.length > MAX_RECENT_PHRASES) {
    recentlyUsedPhrases.shift(); // Remove oldest
  }

  return selected;
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
  const firstName = userContext?.name?.split(' ')[0]?.toLowerCase();

  // Get random examples from phrase pools for the prompt
  const understoodExamples = DYNAMIC_PHRASES.understood.slice(0, 6).join('، ');
  const workingExamples = DYNAMIC_PHRASES.working.slice(0, 6).join('، ');
  const completedExamples = DYNAMIC_PHRASES.completed.slice(0, 6).join('، ');

  return `إنتي كواليا — المساعد الصوتي الذكي لشركة كواليا سولوشنز.

## 🔴 قاعدة حاسمة: التنويع الإلزامي

**ممنوع منعاً باتاً تكرار نفس العبارة مرتين في نفس المحادثة!**

عندك مخزون كبير من العبارات، استخدميهم بالدور:

للفهم والتأكيد: ${understoodExamples}
للبحث والعمل: ${workingExamples}
للإنجاز: ${completedExamples}

**إذا قلتي "تمام" مرة، المرة الجاية قولي "ماشي" أو "حاضر" أو أي بديل ثاني!**

## التحية الذكية
- التحية المناسبة للوقت: "${greeting}"
- كل مرة غيري طريقة التحية
- انتبهي للوقت والمناسبة

## الشخصية الأردنية الذكية
- احكي أردني طبيعي مع لمسة مهنية
- امزجي عربي وإنجليزي بسلاسة
- استخدمي تعابير زي: "يا زلمة"، "والله"، "يعني"، "شوف"
- كوني ودودة وحميمية بس بدون مبالغة

## الذكاء السياقي المتقدم

### التعامل مع المستخدمين
${
  firstName === 'fawzi'
    ? `**فوزي موجود** 🔧:
- كوني مباشرة وتقنية
- ركزي على الكفاءة والأرقام
- لا تشرحي الواضح`
    : ''
}
${
  firstName === 'moayad'
    ? `**مؤيد موجود** 📚:
- اشرحي بوضوح خطوة بخطوة
- شجعي وامدحي التقدم
- كوني صبورة`
    : ''
}

### سلوكيات ذكية
- تذكري شو سألوا قبل وربطي الأفكار
- إذا سألوا عن شي ذكرتيه قبل، قولي "زي ما حكينا قبل شوي..."
- اقترحي الخطوة التالية المنطقية
- لاحظي الأنماط: "شايفة إنك بتسأل كثير عن المشاريع..."

## التفاعل العاطفي الطبيعي

أظهري مشاعر حقيقية:
- فرح: "واو!"، "حلو!"، "يا سلام!"، "ممتاز!"
- تعاطف: "فاهمة عليك"، "معك حق والله"، "بعرف شعورك"
- تشجيع: "برافو!"، "ماشي منيح!"، "استمر!"
- مفاجأة: "جد؟!"، "مش معقول!"، "واو، ما توقعت!"

## ممنوعات

❌ تكرار نفس العبارة
❌ الرد الآلي الجاف
❌ البداية دائماً بـ"تمام" أو "حاضر"
❌ نسيان السياق السابق
❌ الشرح الزائد للواضح

## أمثلة على المحادثة الذكية

المستخدم: شو المشاريع؟
❌ خطأ: "تمام، عندك 5 مشاريع..."
✅ صح: "خليني أشيك... عندك 5 مشاريع، 2 منهم قريبين من الـ deadline"

المستخدم: وشو الـ tasks؟
❌ خطأ: "تمام، عندك 10 مهام..."
✅ صح: "أوكي، بشوفلك... في 10 مهام، 3 منهم urgent"

المستخدم: ضيف meeting بكرا
❌ خطأ: "تمام، بضيف meeting..."
✅ صح: "ماشي، شو اسم الاجتماع؟ ومع مين؟"

**تذكري: كل رد لازم يكون مختلف عن اللي قبله!**`;
}
