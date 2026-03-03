/**
 * RAG retrieval: embed user message, search sealx_chunks only (domain lock at DB).
 * Returns top-k chunks with source_url, title for grounding and citations.
 */
import { supabase } from "./supabase.js";
import { openai } from "./openai.js";

const EMBEDDING_MODEL = "text-embedding-3-small";
const TOP_K = 5;

export type RetrievedChunk = {
  id: string;
  content: string;
  source_url: string;
  title: string | null;
  headings: string | null;
};

export async function retrieveChunks(userMessage: string): Promise<RetrievedChunk[]> {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: userMessage.trim().slice(0, 8000),
  });
  const embedding = res.data?.[0]?.embedding;
  if (!embedding || embedding.length !== 1536) {
    return [];
  }

  const { data, error } = await supabase.rpc("match_sealx_chunks", {
    query_embedding: embedding,
    match_count: TOP_K,
  });

  if (error) {
    console.error("match_sealx_chunks error:", error);
    return [];
  }

  const rows = (data ?? []) as RetrievedChunk[];
  return rows.filter((r) => r?.source_url && (r.source_url.startsWith("https://sealx.com") || r.source_url.startsWith("http://sealx.com")));
}

export function buildContextFromChunks(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c) => {
      const title = c.title ? `[Title: ${c.title}]` : "";
      const url = c.source_url;
      return `${title}\nSource: ${url}\n${c.content}`;
    })
    .join("\n\n---\n\n");
}
