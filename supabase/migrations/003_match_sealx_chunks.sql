-- RPC for semantic search over sealx_chunks (cosine similarity)
CREATE OR REPLACE FUNCTION match_sealx_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  source_url text,
  title text,
  headings text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.content,
    c.source_url,
    c.title,
    c.headings
  FROM public.sealx_chunks c
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
