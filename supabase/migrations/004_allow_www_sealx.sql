-- Allow www.sealx.com in sealx_chunks (same domain as sealx.com)
ALTER TABLE public.sealx_chunks DROP CONSTRAINT IF EXISTS sealx_chunks_source_domain;
ALTER TABLE public.sealx_chunks ADD CONSTRAINT sealx_chunks_source_domain CHECK (
  source_url LIKE 'https://sealx.com%' OR source_url LIKE 'http://sealx.com%'
  OR source_url LIKE 'https://www.sealx.com%' OR source_url LIKE 'http://www.sealx.com%'
);
