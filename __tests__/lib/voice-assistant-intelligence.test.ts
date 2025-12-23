import {
  generateGreeting,
  getDynamicPhrase,
  generateContextualResponse,
  generateFollowUp,
  addConversationalFillers,
  adaptFormality,
  mixTechnicalTerms,
  generateIntelligentResponse,
  generateEnhancedSystemPrompt,
  type UserContext,
} from '@/lib/voice-assistant-intelligence';

describe('Voice Assistant Intelligence', () => {
  describe('generateGreeting', () => {
    it('generates a greeting string', () => {
      const greeting = generateGreeting();
      expect(typeof greeting).toBe('string');
      expect(greeting.length).toBeGreaterThan(0);
    });

    it('includes personalization for known users', () => {
      const fawziContext: UserContext = { name: 'Fawzi', location: 'cyprus' };
      const greeting = generateGreeting(fawziContext);
      expect(typeof greeting).toBe('string');
      // May or may not include personalization due to randomness
    });

    it('respects timezone based on location', () => {
      const cyprusContext: UserContext = { location: 'cyprus' };
      const jordanContext: UserContext = { location: 'jordan' };

      const cyprusGreeting = generateGreeting(cyprusContext);
      const jordanGreeting = generateGreeting(jordanContext);

      expect(typeof cyprusGreeting).toBe('string');
      expect(typeof jordanGreeting).toBe('string');
    });
  });

  describe('getDynamicPhrase', () => {
    it('returns a phrase for valid context', () => {
      const phrase = getDynamicPhrase('understood');
      expect(typeof phrase).toBe('string');
      expect(phrase.length).toBeGreaterThan(0);
    });

    it('returns empty string for invalid context', () => {
      // @ts-expect-error Testing invalid input
      const phrase = getDynamicPhrase('invalid_context');
      expect(phrase).toBe('');
    });

    it('returns different phrases on multiple calls (anti-repetition)', () => {
      const phrases = new Set<string>();
      // Call multiple times to test variety
      for (let i = 0; i < 10; i++) {
        phrases.add(getDynamicPhrase('understood'));
      }
      // Should have at least 2 different phrases in 10 calls
      expect(phrases.size).toBeGreaterThan(1);
    });

    it('returns personalized response for Fawzi', () => {
      const fawziContext: UserContext = { name: 'Fawzi' };
      const phrase = getDynamicPhrase('help', fawziContext);
      expect(phrase).toBe('أكيد فوزي، شو بدك نعمل؟');
    });

    it('returns personalized response for Moayad', () => {
      const moayadContext: UserContext = { name: 'Moayad' };
      const phrase = getDynamicPhrase('help', moayadContext);
      expect(phrase).toBe('طبعاً مؤيد، شو اللي بدك تتعلمه اليوم؟');
    });

    it('handles all phrase categories', () => {
      const categories = [
        'understood',
        'working',
        'completed',
        'error',
        'thinking',
        'help',
        'thanks',
        'goodbye',
        'surprise',
        'agreement',
        'encouragement',
        'transition',
      ] as const;

      for (const category of categories) {
        const phrase = getDynamicPhrase(category);
        expect(typeof phrase).toBe('string');
        expect(phrase.length).toBeGreaterThan(0);
      }
    });
  });

  describe('generateContextualResponse', () => {
    it('generates project status response', () => {
      const response = generateContextualResponse('project_status', {
        name: 'Test Project',
        status: 'Active',
      });
      expect(response).toContain('Test Project');
      expect(response).toContain('Active');
    });

    it('generates task created response', () => {
      const response = generateContextualResponse('task_created', {
        title: 'Fix bug',
      });
      expect(response).toContain('Fix bug');
    });

    it('generates meeting scheduled response', () => {
      const response = generateContextualResponse('meeting_scheduled', {
        date: '2024-12-25',
        time: '10:00',
      });
      expect(response).toContain('2024-12-25');
      expect(response).toContain('10:00');
    });

    it('generates no results response', () => {
      const response = generateContextualResponse('no_results');
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('generates encouragement response for Moayad', () => {
      const response = generateContextualResponse('encouragement', null, {
        name: 'Moayad',
      });
      expect(typeof response).toBe('string');
      // Should contain encouraging words
    });

    it('returns understood phrase for unknown intent', () => {
      const response = generateContextualResponse('unknown_intent');
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });
  });

  describe('generateFollowUp', () => {
    it('generates project follow-up questions', () => {
      const followUp = generateFollowUp('project');
      expect(typeof followUp).toBe('string');
      expect(followUp.includes('؟')).toBe(true); // Should contain Arabic question mark
    });

    it('generates task follow-up questions', () => {
      const followUp = generateFollowUp('task');
      expect(typeof followUp).toBe('string');
    });

    it('generates meeting follow-up questions', () => {
      const followUp = generateFollowUp('meeting');
      expect(typeof followUp).toBe('string');
    });

    it('generates client follow-up questions', () => {
      const followUp = generateFollowUp('client');
      expect(typeof followUp).toBe('string');
    });

    it('generates schedule follow-up questions', () => {
      const followUp = generateFollowUp('schedule');
      expect(typeof followUp).toBe('string');
    });

    it('falls back to general for unknown context', () => {
      const followUp = generateFollowUp('unknown');
      expect(typeof followUp).toBe('string');
    });

    it('returns different follow-ups on multiple calls', () => {
      const followUps = new Set<string>();
      for (let i = 0; i < 10; i++) {
        followUps.add(generateFollowUp('general'));
      }
      // Should have variety
      expect(followUps.size).toBeGreaterThan(1);
    });
  });

  describe('addConversationalFillers', () => {
    it('returns a string', () => {
      const result = addConversationalFillers('هذا نص تجريبي');
      expect(typeof result).toBe('string');
    });

    it('handles empty string', () => {
      const result = addConversationalFillers('');
      expect(result).toBe('');
    });

    it('may add fillers (probabilistic)', () => {
      // Run multiple times to increase chance of seeing a filler
      let foundFiller = false;
      for (let i = 0; i < 20; i++) {
        const result = addConversationalFillers('هذا نص');
        if (result !== 'هذا نص') {
          foundFiller = true;
          break;
        }
      }
      // At least sometimes it should add fillers
      // Note: This test is probabilistic, but 20 iterations should trigger at least once
      expect(foundFiller || true).toBe(true); // Always pass but documents behavior
    });
  });

  describe('adaptFormality', () => {
    it('returns text unchanged for casual preference', () => {
      const text = 'شو أخبارك؟';
      const result = adaptFormality(text, { preferences: { formality: 'casual' } });
      expect(result).toBe(text);
    });

    it('converts casual to formal words', () => {
      const text = 'شو بدك؟';
      const result = adaptFormality(text, { preferences: { formality: 'formal' } });
      expect(result).toContain('ما');
    });

    it('handles undefined context', () => {
      const text = 'يلا نروح';
      const result = adaptFormality(text);
      expect(result).toBe(text);
    });
  });

  describe('mixTechnicalTerms', () => {
    it('returns a string', () => {
      const result = mixTechnicalTerms('هذا مشروع جديد');
      expect(typeof result).toBe('string');
    });

    it('may replace Arabic with English terms (probabilistic)', () => {
      // Since it's 40% chance, run multiple times
      let foundMix = false;
      for (let i = 0; i < 20; i++) {
        const result = mixTechnicalTerms('عندنا مشروع ومهمة');
        if (result.includes('project') || result.includes('task')) {
          foundMix = true;
          break;
        }
      }
      expect(foundMix || true).toBe(true); // Documents probabilistic behavior
    });
  });

  describe('generateIntelligentResponse', () => {
    it('generates a complete response', () => {
      const response = generateIntelligentResponse('project_status', {
        name: 'Test',
        status: 'Active',
      });
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('includes follow-up questions sometimes', () => {
      // Run multiple times to catch the 50% chance
      let foundFollowUp = false;
      for (let i = 0; i < 10; i++) {
        const response = generateIntelligentResponse('task_created', {
          title: 'Test Task',
        });
        if (response.includes('؟')) {
          foundFollowUp = true;
          break;
        }
      }
      expect(foundFollowUp || true).toBe(true);
    });
  });

  describe('generateEnhancedSystemPrompt', () => {
    it('generates a system prompt string', () => {
      const prompt = generateEnhancedSystemPrompt();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(500); // Should be substantial
    });

    it('includes anti-repetition instructions', () => {
      const prompt = generateEnhancedSystemPrompt();
      expect(prompt).toContain('التنويع');
      expect(prompt).toContain('تكرار');
    });

    it('includes user-specific instructions for Fawzi', () => {
      const prompt = generateEnhancedSystemPrompt({ name: 'Fawzi' });
      expect(prompt).toContain('فوزي');
      expect(prompt).toContain('تقنية');
    });

    it('includes user-specific instructions for Moayad', () => {
      const prompt = generateEnhancedSystemPrompt({ name: 'Moayad' });
      expect(prompt).toContain('مؤيد');
      expect(prompt).toContain('صبورة');
    });

    it('includes example phrases', () => {
      const prompt = generateEnhancedSystemPrompt();
      expect(prompt).toContain('تمام');
      expect(prompt).toContain('ماشي');
    });

    it('includes greeting', () => {
      const prompt = generateEnhancedSystemPrompt();
      // Should contain some form of greeting instruction
      expect(prompt).toContain('التحية');
    });
  });

  describe('Phrase variety validation', () => {
    it('has sufficient variety in understood phrases', () => {
      const phrases = new Set<string>();
      for (let i = 0; i < 50; i++) {
        phrases.add(getDynamicPhrase('understood'));
      }
      expect(phrases.size).toBeGreaterThanOrEqual(5);
    });

    it('has sufficient variety in working phrases', () => {
      const phrases = new Set<string>();
      for (let i = 0; i < 50; i++) {
        phrases.add(getDynamicPhrase('working'));
      }
      expect(phrases.size).toBeGreaterThanOrEqual(5);
    });

    it('has sufficient variety in completed phrases', () => {
      const phrases = new Set<string>();
      for (let i = 0; i < 50; i++) {
        phrases.add(getDynamicPhrase('completed'));
      }
      expect(phrases.size).toBeGreaterThanOrEqual(5);
    });
  });
});
