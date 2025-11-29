import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: google('gemini-1.5-flash'),
    messages,
    system: `You are Qualia AI, an intelligent assistant for the Qualia platform.
    You have access to the platform's knowledge base and can help users manage their projects, clients, and issues.

    Your tone is professional, helpful, and concise.
    You can answer questions about the platform, help draft issues, and provide insights.`,
  });

  return result.toTextStreamResponse();
}
