/**
 * AI Client Configuration
 * Uses OpenRouter with Gemini 3 Flash Preview (December 2025)
 */

import { createOpenAI } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

// OpenRouter client for Gemini 3 Flash Preview
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

// Gemini 3 Flash Preview - December 2025 release
// Near Pro-level reasoning with lower latency
// 1M token context window
export const geminiModel = openrouter('google/gemini-3-flash-preview');

// Same model for simpler tasks
export const geminiFlashModel = openrouter('google/gemini-3-flash-preview');

// Keep Google embeddings for RAG (superior quality)
export const geminiEmbeddingModel = google.textEmbeddingModel('text-embedding-004');
