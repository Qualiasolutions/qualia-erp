-- Add vector similarity search function for RAG
-- This enables Qualia voice assistant to search the knowledge base

-- Function to search documents by vector similarity
create or replace function match_documents(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5,
  filter_workspace_id uuid default null
)
returns table (
  id uuid,
  title text,
  content text,
  url text,
  metadata jsonb,
  similarity float
)
language plpgsql
security definer
as $$
begin
  return query
  select
    d.id,
    d.title,
    d.content,
    d.url,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  from documents d
  where
    d.embedding is not null
    and 1 - (d.embedding <=> query_embedding) > match_threshold
    and (filter_workspace_id is null or d.workspace_id = filter_workspace_id)
  order by d.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Create index for faster vector similarity search (if not exists)
create index if not exists documents_embedding_idx on documents
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- RLS policy for documents (allow authenticated users to read)
create policy "Authenticated users can view documents in their workspace"
on public.documents
for select
to authenticated
using (
  workspace_id is null
  or workspace_id in (
    select workspace_id from workspace_members where profile_id = auth.uid()
  )
);

-- Allow admins to manage documents
create policy "Admins can manage documents"
on public.documents
for all
to authenticated
using (
  exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  )
)
with check (
  exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  )
);
