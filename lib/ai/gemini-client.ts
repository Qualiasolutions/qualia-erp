/**
 * Gemini 2.5 Flash Client Configuration
 * FREE tier - 1M tokens/min input, 65K tokens output
 */

import { google } from '@ai-sdk/google';

// Gemini 2.5 Flash - FREE tier, excellent quality
// Rate limits: 1,000,000 tokens/minute (input), 65,536 tokens (output)
export const geminiModel = google('gemini-2.5-flash-preview-05-20');

// Alternative for simpler tasks (faster, lower cost if on paid tier)
export const geminiFlashModel = google('gemini-2.0-flash');

// Model for embeddings (used for RAG/knowledge base)
export const geminiEmbeddingModel = google.textEmbeddingModel('text-embedding-004');
