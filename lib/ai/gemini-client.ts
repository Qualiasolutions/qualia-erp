/**
 * AI Client Configuration
 * Uses OpenRouter with Gemini 3 Flash
 */

import { createOpenAI } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

// OpenRouter client - configured for chat completions
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  headers: {
    'HTTP-Referer': 'https://qualia-erp.vercel.app',
    'X-Title': 'Qualia ERP',
  },
});

// Gemini 3 Flash Preview - Latest model
export const geminiModel = openrouter('google/gemini-3-flash-preview');

// Gemini 2.5 Flash - Stable fallback
export const geminiFlashModel = openrouter('google/gemini-2.5-flash-preview');

// Keep Google embeddings for RAG (requires GOOGLE_GENERATIVE_AI_API_KEY)
export const geminiEmbeddingModel = google.textEmbeddingModel('text-embedding-004');
