import { google } from '@ai-sdk/google'

// Configure AI model
export const model = google('gemini-2.0-flash-exp')

// System prompt for the AI agent
export const systemPrompt = `You are a helpful AI assistant.

Guidelines:
- Be concise and direct
- Ask clarifying questions when needed
- Provide accurate information
- Admit when you don't know something

[Add client-specific instructions here]
`
