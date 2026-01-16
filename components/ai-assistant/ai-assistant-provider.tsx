'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type AssistantMode = 'chat' | 'voice' | 'document';
export type GuidedTask = 'create-project' | 'create-client' | null;

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
  guidedTask: GuidedTask;

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
  startGuidedTask: (task: GuidedTask) => void;
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
  const [guidedTask, setGuidedTask] = useState<GuidedTask>(null);

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

  // Internal send message function (used by startGuidedTask)
  const sendMessageInternal = useCallback(
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
        const chatMessages = [
          {
            role: 'user' as const,
            content: text.trim(),
          },
        ];

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
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming]
  );

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
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to send message');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        const assistantId = `assistant-${Date.now()}`;
        let buffer = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Parse the AI SDK streaming format
            // Format: 0:"text chunk" or other prefixed data
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (!line.trim()) continue;

              // AI SDK format: number:data
              const colonIndex = line.indexOf(':');
              if (colonIndex === -1) continue;

              const prefix = line.substring(0, colonIndex);
              const data = line.substring(colonIndex + 1);

              // 0 = text delta, 2 = tool call, 3 = tool result, etc.
              if (prefix === '0') {
                try {
                  // Data is JSON-encoded string
                  const textChunk = JSON.parse(data);
                  if (typeof textChunk === 'string') {
                    assistantContent += textChunk;
                  }
                } catch {
                  // Not valid JSON, skip
                }
              }
            }

            // Update the message with accumulated content
            if (assistantContent) {
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

          // Process any remaining buffer
          if (buffer.trim()) {
            const colonIndex = buffer.indexOf(':');
            if (colonIndex !== -1) {
              const prefix = buffer.substring(0, colonIndex);
              const data = buffer.substring(colonIndex + 1);
              if (prefix === '0') {
                try {
                  const textChunk = JSON.parse(data);
                  if (typeof textChunk === 'string') {
                    assistantContent += textChunk;
                    setMessages((prev) => {
                      const newMessages = [...prev];
                      const lastMessage = newMessages[newMessages.length - 1];
                      if (lastMessage?.id === assistantId) {
                        lastMessage.content = assistantContent;
                      }
                      return newMessages;
                    });
                  }
                } catch {
                  // Skip invalid data
                }
              }
            }
          }
        }

        // If no content was extracted, show a fallback message
        if (!assistantContent) {
          setMessages((prev) => [
            ...prev,
            {
              id: assistantId,
              role: 'assistant',
              content:
                'I received your message but could not generate a response. Please try again.',
            },
          ]);
        }
      } catch (err) {
        console.error('Chat error:', err);
        setError(err instanceof Error ? err.message : 'Something went wrong');
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
          },
        ]);
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, mode, isStreaming]
  );

  // Start a guided task (like create project or create client)
  const startGuidedTask = useCallback(
    (task: GuidedTask) => {
      setGuidedTask(task);
      setIsOpen(true);
      setIsMinimized(false);
      setModeState('chat');
      setShowTemplates(false);

      // Clear any existing conversation
      setMessages([]);
      setError(null);

      // Send initial prompt based on task
      if (task === 'create-project') {
        const initialPrompt = `I want to create a new project. Please help me by asking the necessary questions one by one:
1. Project name
2. Client (or create new)
3. Project type (web design, ai agent, voice agent, seo, ads)
4. Description
5. Any other relevant details

Start by asking for the project name.`;

        // Trigger the sendMessage after state is set
        setTimeout(() => {
          sendMessageInternal(initialPrompt);
        }, 100);
      } else if (task === 'create-client') {
        const initialPrompt = `I want to add a new client. Please help me by asking the necessary questions one by one:
1. Client/Company name
2. Contact person name
3. Email
4. Phone (optional)
5. Lead status
6. Any notes

Start by asking for the company name.`;

        setTimeout(() => {
          sendMessageInternal(initialPrompt);
        }, 100);
      }
    },
    [sendMessageInternal]
  );

  return (
    <AIAssistantContext.Provider
      value={{
        isOpen,
        isMinimized,
        mode,
        showTemplates,
        guidedTask,
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
        startGuidedTask,
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
