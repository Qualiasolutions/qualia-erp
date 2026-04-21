import { google } from '@ai-sdk/google';
import { embedMany, embed } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { aiRateLimiter } from '@/lib/rate-limit';

export const maxDuration = 30;

const inputSchema = z.object({
  action: z.enum(['generate', 'search']),
  text: z.string().optional(),
  texts: z.array(z.string()).optional(),
  query: z.string().optional(),
  threshold: z.number().min(0).max(1).optional().default(0.7),
  limit: z.number().min(1).max(20).optional().default(5),
});

/**
 * Embeddings API for RAG knowledge base
 *
 * POST /api/embeddings
 *
 * Actions:
 * - generate: Generate embeddings for texts (for storing documents)
 * - search: Search documents by semantic similarity
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Role guard — block client accounts from embeddings/RAG
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'client') {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // BH-C1: Rate limiting — 20 requests/minute per user
    const rateLimitResult = await aiRateLimiter(user.id);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.', retryAfter }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    // Get workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('profile_id', user.id)
      .eq('is_default', true)
      .single();

    const workspaceId = membership?.workspace_id;

    const body = await req.json();
    const input = inputSchema.parse(body);

    // Check for Google API key
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Google AI API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (input.action === 'generate') {
      // Generate embeddings for one or more texts
      // Using Google's text-embedding-004 (768 dimensions, free tier available)
      if (input.text) {
        const { embedding } = await embed({
          model: google.textEmbeddingModel('text-embedding-004'),
          value: input.text,
        });
        return Response.json({ embedding, dimensions: embedding.length });
      }

      if (input.texts && input.texts.length > 0) {
        const { embeddings } = await embedMany({
          model: google.textEmbeddingModel('text-embedding-004'),
          values: input.texts,
        });
        return Response.json({
          embeddings,
          count: embeddings.length,
          dimensions: embeddings[0]?.length || 0,
        });
      }

      return Response.json({ error: 'No text provided' }, { status: 400 });
    }

    if (input.action === 'search') {
      if (!input.query) {
        return Response.json({ error: 'No query provided' }, { status: 400 });
      }

      // Generate embedding for the query using Google's model
      const { embedding } = await embed({
        model: google.textEmbeddingModel('text-embedding-004'),
        value: input.query,
      });

      // Search using match_documents function
      const { data: documents, error } = await supabase.rpc('match_documents', {
        query_embedding: embedding,
        match_threshold: input.threshold,
        match_count: input.limit,
        filter_workspace_id: workspaceId,
      });

      if (error) {
        console.error('Search error:', error);
        return Response.json({ error: 'Search failed' }, { status: 500 });
      }

      return Response.json({
        query: input.query,
        results: documents || [],
        count: documents?.length || 0,
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Embeddings API error:', error);
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
