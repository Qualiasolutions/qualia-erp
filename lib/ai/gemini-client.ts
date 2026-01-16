/**
 * AI Client Configuration
 * Uses OpenRouter with Gemini 2.5 Flash
 */

import { createOpenAI } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

// OpenRouter client
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

// Gemini 2.5 Flash - Fast and capable
export const geminiModel = openrouter('google/gemini-2.5-flash-preview');

// Same model for simpler tasks
export const geminiFlashModel = openrouter('google/gemini-2.5-flash-preview');

// Keep Google embeddings for RAG
export const geminiEmbeddingModel = google.textEmbeddingModel('text-embedding-004');
