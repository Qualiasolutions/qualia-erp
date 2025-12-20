import { openai } from '@ai-sdk/openai';
import { embedMany, embed } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

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

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (input.action === 'generate') {
      // Generate embeddings for one or more texts
      if (input.text) {
        const { embedding } = await embed({
          model: openai.embedding('text-embedding-3-small'),
          value: input.text,
        });
        return Response.json({ embedding, dimensions: embedding.length });
      }

      if (input.texts && input.texts.length > 0) {
        const { embeddings } = await embedMany({
          model: openai.embedding('text-embedding-3-small'),
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

      // Generate embedding for the query
      const { embedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
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
