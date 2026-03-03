/**
 * SealX ingestion: crawl https://sealx.com only, chunk, embed, store in sealx_chunks.
 * Domain lock: only sealx.com. Respects robots.txt. Sitemap-first, else BFS.
 * Run: pnpm run ingest:sealx (from repo root) or pnpm --filter @outbound/backend run ingest:sealx
 */
import "dotenv/config";
import { load } from "cheerio";
import robotsParser from "robots-parser";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const BASE_URL = "https://sealx.com";
const ALLOWED_ORIGIN = new URL(BASE_URL).origin;
const CHUNK_SIZE = 600;
const CHUNK_OVERLAP = 100;
const TOP_K_PAGES = 200;
const EMBEDDING_MODEL = "text-embedding-3-small";

function domainLock(url: string): boolean {
  try {
    const u = new URL(url);
    return u.origin === ALLOWED_ORIGIN && (u.hostname === "sealx.com" || u.hostname === "www.sealx.com");
  } catch {
    return false;
  }
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    u.searchParams.sort();
    return u.toString().replace(/\/$/, "") || u.origin + "/";
  } catch {
    return url;
  }
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "SealXBot/1.0 (compliance crawl)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

async function getRobots(url: string): Promise<ReturnType<typeof robotsParser>> {
  const origin = new URL(url).origin;
  const robotsUrl = `${origin}/robots.txt`;
  try {
    const text = await fetchText(robotsUrl);
    return robotsParser(robotsUrl, text);
  } catch {
    return robotsParser(robotsUrl, "");
  }
}

async function getSitemapUrls(robots: ReturnType<typeof robotsParser>): Promise<string[]> {
  const sitemapUrl = robots.getSitemaps?.()?.[0] ?? `${BASE_URL}/sitemap.xml`;
  const out: string[] = [];
  try {
    const text = await fetchText(sitemapUrl);
    const $ = load(text, { xmlMode: true });
    $("url loc").each((_, el) => {
      const loc = $(el).text().trim();
      if (loc && domainLock(loc)) out.push(normalizeUrl(loc));
    });
    $("sitemap loc").each((_, el) => {
      const loc = $(el).text().trim();
      if (loc && domainLock(loc)) out.push(loc);
    });
  } catch (e) {
    console.warn("Sitemap fetch failed, will use BFS:", (e as Error).message);
  }
  return [...new Set(out)];
}

async function bfsStartUrls(): Promise<string[]> {
  const seen = new Set<string>();
  const queue: string[] = [normalizeUrl(BASE_URL)];
  const results: string[] = [];
  const robots = await getRobots(BASE_URL);

  while (queue.length > 0 && results.length < TOP_K_PAGES) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);
    if (!domainLock(url)) continue;
    try {
      if (!robots.isAllowed?.(url, "SealXBot")) continue;
    } catch {
      // allow if robots check fails
    }
    results.push(url);
    try {
      const html = await fetchText(url);
      const $ = load(html);
      $('a[href]').each((_, el) => {
        const href = $(el).attr("href");
        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
        try {
          const full = new URL(href, url).href;
          const norm = normalizeUrl(full);
          if (domainLock(norm) && !seen.has(norm)) queue.push(norm);
        } catch {}
      });
    } catch (e) {
      console.warn("Skip (fetch failed):", url, (e as Error).message);
    }
  }
  return results;
}

function extractMainContent($: ReturnType<typeof load>, baseUrl: string): { title: string; headings: string; text: string } {
  const title = $("title").text().trim() || "";
  $("script, style, nav, footer, header, iframe, noscript").remove();
  const headings: string[] = [];
  $("h1, h2, h3").each((_, el) => {
    const t = $(el).text().trim();
    if (t) headings.push(t);
  });
  const main = $("main, article, [role='main']").first();
  const body = main.length ? main : $("body");
  const text = body.text().replace(/\s+/g, " ").trim();
  return { title, headings: headings.join(" | "), text };
}

function chunkText(text: string, meta: { source_url: string; title: string; headings: string }): Array<{ content: string; source_url: string; title: string; headings: string }> {
  const chunks: Array<{ content: string; source_url: string; title: string; headings: string }> = [];
  let start = 0;
  const overlap = Math.min(CHUNK_OVERLAP, Math.floor(CHUNK_SIZE / 2));
  while (start < text.length) {
    let end = start + CHUNK_SIZE;
    if (end < text.length) {
      const nextSpace = text.lastIndexOf(" ", end);
      if (nextSpace > start) end = nextSpace + 1;
    }
    const slice = text.slice(start, end).trim();
    if (slice.length > 0) {
      chunks.push({ content: slice, ...meta });
    }
    start = end - overlap;
    if (start >= text.length) break;
  }
  return chunks;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY_WEBSITE_CHAT;
  if (!supabaseUrl || !supabaseKey || !openaiKey) {
    throw new Error("Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY_WEBSITE_CHAT in backend/.env");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const openai = new OpenAI({ apiKey: openaiKey });

  let urls: string[] = [];
  const robots = await getRobots(BASE_URL);
  const sitemapUrls = await getSitemapUrls(robots);
  if (sitemapUrls.length > 0) {
    const pageUrls = sitemapUrls.filter((u) => !/sitemap(_index)?\.xml$/i.test(u));
    urls = pageUrls.filter((u) => {
      try {
        return robots.isAllowed?.(u, "SealXBot") !== false;
      } catch {
        return true;
      }
    }).slice(0, TOP_K_PAGES);
    console.log("Using sitemap:", urls.length, "URLs");
  }
  if (urls.length === 0) {
    urls = await bfsStartUrls();
    console.log("Using BFS:", urls.length, "URLs");
  }

  const allChunks: Array<{ content: string; source_url: string; title: string; headings: string }> = [];
  const now = new Date().toISOString();

  for (const url of urls) {
    if (!domainLock(url)) continue;
    try {
      const html = await fetchText(url);
      const $ = load(html);
      const { title, headings, text } = extractMainContent($, url);
      if (text.length < 50) continue;
      const meta = { source_url: url, title, headings };
      allChunks.push(...chunkText(text, meta));
    } catch (e) {
      console.warn("Skip:", url, (e as Error).message);
    }
  }

  console.log("Chunks to embed:", allChunks.length);
  if (allChunks.length === 0) {
    console.log("No content; run again after checking sealx.com is reachable.");
    return;
  }

  const { error: delErr } = await supabase.from("sealx_chunks").delete().like("source_url", "https://sealx.com%");
  if (delErr) console.warn("Could not clear old chunks (re-run may duplicate):", delErr.message);

  const BATCH = 100;
  for (let i = 0; i < allChunks.length; i += BATCH) {
    const batch = allChunks.slice(i, i + BATCH);
    const texts = batch.map((c) => c.content);
    const embRes = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: texts });
    const byIndex = new Map(embRes.data.map((d) => [d.index ?? -1, d.embedding]));
    const rows = batch.map((chunk, j) => {
      const vec = byIndex.get(j);
      if (!vec) throw new Error("Missing embedding for index " + j);
      return {
        content: chunk.content,
        embedding: vec,
        source_url: chunk.source_url,
        title: chunk.title || null,
        headings: chunk.headings || null,
        last_crawled_at: now,
      };
    });
    const { error } = await supabase.from("sealx_chunks").insert(rows);
    if (error) throw new Error("Insert failed: " + error.message);
  }

  const { count } = await supabase.from("sealx_chunks").select("id", { count: "exact", head: true });
  console.log("Done. sealx_chunks count:", count ?? allChunks.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
