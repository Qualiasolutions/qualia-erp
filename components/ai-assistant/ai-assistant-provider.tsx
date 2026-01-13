'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type AssistantMode = 'chat' | 'voice' | 'document';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantContextType {
  // UI State
  isOpen: boolean;
  isMinimized: boolean;
  mode: AssistantMode;
  showTemplates: boolean;

  // Conversation State
  messages: Message[];
  isStreaming: boolean;
  error: string | null;

  // Voice State
  isListening: boolean;
  isSpeaking: boolean;
  voiceEnabled: boolean;

  // Actions
  open: () => void;
  close: () => void;
  minimize: () => void;
  setMode: (mode: AssistantMode) => void;
  toggleTemplates: () => void;
  toggleVoice: () => void;
  sendMessage: (text: string) => Promise<void>;
  clearConversation: () => void;
  setListening: (listening: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  setError: (error: string | null) => void;
}

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

const STORAGE_KEY_MODE = 'ai-assistant-mode';
const STORAGE_KEY_VOICE = 'ai-assistant-voice-enabled';

// Document drafting system prompt
const DOCUMENT_SYSTEM_PROMPT = `You are the Documentation Specialist for Qualia Solutions LTD (Cyprus).

## WHEN USER REQUESTS A DOCUMENT:

**Step 1 - Identify Document Type:**
- AI Agent Agreement (voice agents, chatbots, automation)
- Web Development Agreement (websites, web apps)
- Marketing Agreement (social media, digital marketing)
- NDA (confidentiality agreements)

**Step 2 - Ask Required Information:**
Ask these questions ONE AT A TIME in a conversational way:

1. "What's the client's company name and registration number?"
2. "Who is the contact person and their email?"
3. "Describe the project scope - what are we building/doing?"
4. "What's the timeline? (Start date and duration)"
5. "What's the pricing structure?"
   - Fixed: "Total amount and deposit percentage?"
   - Monthly: "Monthly fee and any setup fee?"
   - Milestone: "What are the milestones and amounts?"
6. "Any special terms or requirements?"

**Step 3 - Generate Document:**
Once you have all information, generate a COMPLETE professional agreement with:
- All sections filled (no [BRACKETS] placeholders)
- Cyprus jurisdiction and governing law
- All amounts stated as "+ VAT"
- Qualia Solutions branding throughout

**Step 4 - Format for Print:**
Format the final document with clear section headers for easy printing:
- Use "---" for page breaks between major sections
- Bold section headers
- Numbered clauses
- Professional formatting

COMPANY INFO:
- Legal Name: Qualio Solutions LTD
- Registration: 1109346
- Address: Nicosia, Lefkosia 1011, Cyprus
- Founder: Fawzi Goussous
- Email: info@qualiasolutions.net
- Phone: +357 99111668

Available templates: AI Agent, Web Development, Marketing, NDA`;

export function AIAssistantProvider({ children }: { children: ReactNode }) {
  // UI State
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [mode, setModeState] = useState<AssistantMode>('chat');
  const [showTemplates, setShowTemplates] = useState(false);

  // Conversation State
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  // Hydration flag
  const [isHydrated, setIsHydrated] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    const storedMode = localStorage.getItem(STORAGE_KEY_MODE);
    if (storedMode && ['chat', 'voice', 'document'].includes(storedMode)) {
      setModeState(storedMode as AssistantMode);
    }
    const storedVoice = localStorage.getItem(STORAGE_KEY_VOICE);
    if (storedVoice !== null) {
      setVoiceEnabled(storedVoice === 'true');
    }
    setIsHydrated(true);
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY_MODE, mode);
    }
  }, [mode, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY_VOICE, String(voiceEnabled));
    }
  }, [voiceEnabled, isHydrated]);

  // Actions
  const open = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, []);

  const minimize = useCallback(() => {
    setIsMinimized(true);
    setIsOpen(false);
  }, []);

  const setMode = useCallback((newMode: AssistantMode) => {
    setModeState(newMode);
    setShowTemplates(false);
  }, []);

  const toggleTemplates = useCallback(() => {
    setShowTemplates((prev) => !prev);
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => !prev);
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const setListening = useCallback((listening: boolean) => {
    setIsListening(listening);
  }, []);

  const setSpeaking = useCallback((speaking: boolean) => {
    setIsSpeaking(speaking);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text.trim(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);
      setError(null);

      try {
        // Build messages with optional document context
        const isFirstMessage = messages.length === 0;
        const shouldUseDocumentContext = mode === 'document';

        let chatMessages;
        if (isFirstMessage && shouldUseDocumentContext) {
          chatMessages = [
            {
              role: 'user' as const,
              content: `${DOCUMENT_SYSTEM_PROMPT}\n\nUser request: ${text.trim()}`,
            },
          ];
        } else {
          chatMessages = [
            ...messages.map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
            { role: 'user' as const, content: text.trim() },
          ];
        }

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: chatMessages }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        const assistantId = `assistant-${Date.now()}`;

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            assistantContent += decoder.decode(value);

            setMessages((prev) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage?.id === assistantId) {
                lastMessage.content = assistantContent;
              } else {
                newMessages.push({
                  id: assistantId,
                  role: 'assistant',
                  content: assistantContent,
                });
              }
              return newMessages;
            });
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: 'Something went wrong. Please try again.',
          },
        ]);
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, mode, isStreaming]
  );

  return (
    <AIAssistantContext.Provider
      value={{
        isOpen,
        isMinimized,
        mode,
        showTemplates,
        messages,
        isStreaming,
        error,
        isListening,
        isSpeaking,
        voiceEnabled,
        open,
        close,
        minimize,
        setMode,
        toggleTemplates,
        toggleVoice,
        sendMessage,
        clearConversation,
        setListening,
        setSpeaking,
        setError,
      }}
    >
      {children}
    </AIAssistantContext.Provider>
  );
}

export function useAIAssistant() {
  const context = useContext(AIAssistantContext);
  if (context === undefined) {
    throw new Error('useAIAssistant must be used within an AIAssistantProvider');
  }
  return context;
}
