# Chatbot Widget (Prototype)

A minimal "bottom-right corner" chat widget with:
- **Frontend**: React + Vite (TypeScript)
- **Backend**: Express (TypeScript) that calls OpenAI
- **Shared types** between frontend/backend

## Quick start (pnpm)
1) Copy `.env.example` to `backend/.env` and set your key.
2) Install deps:
```bash
pnpm install
```
3) Run both frontend + backend:
```bash
pnpm dev
```

- Frontend: http://localhost:5173
- Backend:   http://localhost:3001

## Notes
- Your OpenAI key must stay **server-side** (in `backend/.env`).
- This is intentionally bare-bones so you can evolve it into a lead-capture bot later.
