# SealX Demo Chatbot Widget

A minimal "bottom-right corner" chat widget with **SealX-only RAG**: answers only from sealx.com content, refuses off-topic questions, and offers lead capture / handoff.

- **Frontend**: React + Vite (TypeScript)
- **Backend**: Express (TypeScript), OpenAI (chat + embeddings), Supabase (leads + pgvector)
- **RAG**: Crawl sealx.com → chunk → embed → store in `sealx_chunks`; retrieval on each chat; strict grounding and no external search

## Quick start (pnpm)

1. Copy `backend/env.example` to `backend/.env` and set your keys.
2. Install deps and run migrations (see [Deploy](#how-to-deploy--embed) for Supabase/pgvector).
3. Install and run:

```bash
pnpm install
pnpm dev
```

- Frontend: http://localhost:5173  
- Backend: http://localhost:3001  

4. Ingest SealX content once: `pnpm run ingest:sealx` (requires backend env and Supabase `sealx_chunks` table).

---

## How to deploy + embed

### Environment variables

**Backend** (e.g. `backend/.env` or Vercel):

- `OPENAI_API_KEY_WEBSITE_CHAT` — OpenAI API key (chat + embeddings).
- `SUPABASE_URL` — Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key.
- `PORT` — Optional; default 3001.

**Frontend** (build-time, optional):

- `VITE_BACKEND_URL` — API base URL for the main app (e.g. `https://your-api.vercel.app`). Omit when using embed with `apiBaseUrl` in URL or script.

### Supabase setup

1. Enable the **pgvector** extension in the Supabase SQL editor: `CREATE EXTENSION IF NOT EXISTS vector;`
2. Run the migrations in `supabase/migrations/` in order (001, 002, 003) in the SQL editor.
3. Ensure the `chatbot_leads` table exists (original schema); migration 002 adds optional columns.

### Build and host

1. Build backend and frontend:

```bash
pnpm build
```

2. Backend: deploy `backend/` (e.g. Vercel with `backend/vercel.json` and root `api/[[...path]].js` for serverless).
3. Frontend: deploy `frontend/dist/` (and serve `widget.js` and `embed.html` from the same origin as the script).

### Ingest SealX content

From repo root (with backend env and Supabase configured):

```bash
pnpm run ingest:sealx
```

This crawls **all** SealX pages (sitemap if present, otherwise BFS from the homepage following same-origin links), not just the homepage. It only ingests from sealx.com / www.sealx.com, then chunks and embeds content into `sealx_chunks`. Re-run to refresh.

If you see "fetch failed" due to SSL (e.g. certificate doesn’t match sealx.com), try the host that has a valid cert, e.g. `www.sealx.com`:

```bash
SEALX_BASE_URL=https://www.sealx.com pnpm run ingest:sealx
```

Or temporarily allow insecure TLS (not for production): `NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm run ingest:sealx`

### One-line embed (for SealX site)

**Script tag (recommended)** — injects the widget as an iframe:

```html
<script
  src="https://YOUR-FRONTEND-HOST/widget.js"
  data-api-url="https://YOUR-BACKEND-API"
  data-workspace="SealX"
  data-theme-color="#111"
></script>
```

**Iframe** — embed the chat page directly:

```html
<iframe
  src="https://YOUR-FRONTEND-HOST/embed.html?apiBaseUrl=https://YOUR-BACKEND-API"
  title="SealX Chat"
  width="400"
  height="600"
  style="border:none;"
></iframe>
```

Replace `YOUR-FRONTEND-HOST` with the URL where you host the built frontend (e.g. Vercel frontend URL), and `YOUR-BACKEND-API` with the backend API base (e.g. `https://your-api.vercel.app`).

**Launcher and greeting config** — Customize the “Text us” launcher and the greeting bubble via URL params or `window.__SEALX_CONFIG__` before the script loads:

- `primaryColor` (or `themeColor`) — Launcher button color (e.g. `#a85c41`).
- `launcherText` — Button label (default: `"Text us"`).
- `greetingText` — Greeting bubble copy (default: `"Hi there, have a question? Text us here."`).
- `avatarUrl` — Image URL for the greeting bubble avatar (default: placeholder).

Example iframe: `embed.html?apiBaseUrl=...&primaryColor=%23a85c41&launcherText=Chat&greetingText=Questions%3F%20We%27re%20here.`

### Demo page

Open `https://YOUR-FRONTEND-HOST/demo.html` (or locally `http://localhost:5173/demo.html` with backend on 3001) to test the widget and copy the embed snippet.

---

## Test policy and validation

With the backend running:

```bash
pnpm --filter @outbound/backend run test:sealx
```

Optional: `BACKEND_URL=http://your-api.com pnpm --filter @outbound/backend run test:sealx`

Tests: off-topic refusal, SealX FAQ behavior, no non-sealx.com citations, email/phone validation and valid lead submission.

---

## Notes

- All answers are grounded in retrieved sealx.com chunks only; no web browsing or general search.
- Lead capture: email (must contain `@` with chars before/after), phone (exactly 10 digits). Optional: transcript_id, last_question, referrer, UTM params.
- Your OpenAI and Supabase keys must stay server-side (backend only).
