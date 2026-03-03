-- Additive-only migration:
-- - Enables required extensions if missing
-- - Creates NEW table public.sealx_chunks only (does not touch existing app tables)

-- Required for vector type / indexes (Supabase typically has this available)
CREATE EXTENSION IF NOT EXISTS vector;

-- Required for gen_random_uuid() default (Supabase typically has this enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- SealX RAG chunks: only populated from sealx.com crawl
CREATE TABLE IF NOT EXISTS public.sealx_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  embedding vector(1536) NOT NULL,
  source_url text NOT NULL,
  title text,
  headings text,
  last_crawled_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sealx_chunks_source_domain CHECK (
    source_url LIKE 'https://sealx.com%' OR source_url LIKE 'http://sealx.com%'
  )
);

-- Index for similarity search (cosine distance). HNSW works on empty table.
CREATE INDEX IF NOT EXISTS sealx_chunks_embedding_idx ON public.sealx_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Optional: index for filtering by source_url
CREATE INDEX IF NOT EXISTS sealx_chunks_source_url_idx ON public.sealx_chunks (source_url);

COMMENT ON TABLE public.sealx_chunks IS 'RAG chunks from sealx.com only; domain lock enforced by CHECK constraint';
