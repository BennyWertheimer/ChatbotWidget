-- Enable pgvector extension (run in Supabase SQL Editor if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- SealX RAG chunks: only populated from sealx.com crawl
CREATE TABLE IF NOT EXISTS sealx_chunks (
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
CREATE INDEX IF NOT EXISTS sealx_chunks_embedding_idx ON sealx_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Optional: index for filtering by source_url
CREATE INDEX IF NOT EXISTS sealx_chunks_source_url_idx ON sealx_chunks (source_url);

COMMENT ON TABLE sealx_chunks IS 'RAG chunks from sealx.com only; domain lock enforced by CHECK constraint';
