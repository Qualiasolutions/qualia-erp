-- Fix embedding dimension mismatch
-- The documents.embedding column was created with 1536 dimensions (OpenAI spec)
-- but the active model is Google text-embedding-004 which produces 768 dimensions.
-- Every match_documents call with a 768-dim query against a 1536-dim column
-- either errors or returns zero results, breaking RAG search entirely.

-- Step 1: Null out stale 1536-dim embeddings so they can be re-embedded
UPDATE documents SET embedding = NULL WHERE embedding IS NOT NULL;

-- Step 2: Drop the old ivfflat index before altering the column type
DROP INDEX IF EXISTS documents_embedding_idx;

-- Step 3: Change column type from 1536 dims to 768 dims
ALTER TABLE documents ALTER COLUMN embedding TYPE vector(768);

-- Step 4: Recreate match_documents RPC with vector(768) parameter
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_threshold float default 0.7,
  match_count int default 5,
  filter_workspace_id uuid default null
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  url text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.content,
    d.url,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE
    d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
    AND (filter_workspace_id IS NULL OR d.workspace_id = filter_workspace_id)
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Step 5: Rebuild ivfflat index for the new vector(768) dimension
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
