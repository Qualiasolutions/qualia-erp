/**
 * AI Client Configuration
 * Uses OpenRouter with Gemini 2.0 Flash (FREE)
 */

import { createOpenAI } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

// OpenRouter client
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

// Gemini 2.0 Flash Thinking (Free) - Latest reasoning model
// https://openrouter.ai/google/gemini-2.0-flash-thinking-exp:free
export const geminiModel = openrouter('google/gemini-2.0-flash-thinking-exp:free');

// Gemini 2.0 Flash (Free) - Faster for simple tasks
export const geminiFlashModel = openrouter('google/gemini-2.0-flash-exp:free');

// Keep Google embeddings for RAG
export const geminiEmbeddingModel = google.textEmbeddingModel('text-embedding-004');
