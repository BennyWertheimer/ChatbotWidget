import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import { openai } from "./openai.js";
import { buildSystemPrompt, NO_CHUNKS_REPLY } from "./prompt.js";
import { retrieveChunks, buildContextFromChunks } from "./retrieve.js";
import { supabase } from "./supabase.js";
import type { ChatRequest, ChatResponse } from "@outbound/shared";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const ChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string().min(1)
  })).min(1)
});

function validateEmail(email: string): boolean {
  const s = email.trim();
  const at = s.indexOf("@");
  return at > 0 && at < s.length - 1 && s.length >= 3;
}

function validatePhone(phone: string): { valid: boolean; digits: string } {
  const digits = phone.replace(/\s|\(|\)|-|\./g, "");
  return { valid: /^\d{10}$/.test(digits), digits };
}

const LeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").refine(validateEmail, "Please enter a valid email (e.g. you@example.com)"),
  phone: z.string().min(1, "Phone is required").transform((s) => {
    const { valid, digits } = validatePhone(s);
    if (!valid) throw new Error("Phone must be exactly 10 digits (spaces, dashes, parentheses are ok)");
    return digits;
  }),
  transcript_id: z.string().optional(),
  last_question: z.string().optional(),
  referrer: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/lead", async (req, res) => {
  try {
    const parsed = LeadSchema.parse(req.body);
    const row: Record<string, unknown> = {
      Name: parsed.name.trim(),
      Email: parsed.email.trim(),
      Phone: parsed.phone,
    };
    if (parsed.transcript_id != null) row.transcript_id = parsed.transcript_id;
    if (parsed.last_question != null) row.last_question = parsed.last_question;
    if (parsed.referrer != null) row.referrer = parsed.referrer;
    if (parsed.utm_source != null) row.utm_source = parsed.utm_source;
    if (parsed.utm_medium != null) row.utm_medium = parsed.utm_medium;
    if (parsed.utm_campaign != null) row.utm_campaign = parsed.utm_campaign;
    const { error } = await supabase.from("chatbot_leads").insert(row);
    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: error.message });
    }
    res.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err?.message ?? "Bad request" });
  }
});

app.post("/chat", async (req, res) => {
  try {
    const parsed = ChatRequestSchema.parse(req.body) as ChatRequest;
    const lastUserMessage = [...parsed.messages].reverse().find((m) => m.role === "user")?.content?.trim();
    if (!lastUserMessage) {
      return res.status(400).json({ error: "No user message" });
    }

    const chunks = await retrieveChunks(lastUserMessage);
    if (chunks.length === 0) {
      return res.json({ reply: NO_CHUNKS_REPLY });
    }

    const context = buildContextFromChunks(chunks);
    const systemContent = buildSystemPrompt(context);

    const messages = [
      { role: "system" as const, content: systemContent },
      ...parsed.messages,
    ];

    let reply: string;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
      });
      reply = completion.choices[0]?.message?.content?.trim() || NO_CHUNKS_REPLY;
    } catch (llmErr: any) {
      console.error("[chat] LLM error:", llmErr?.message ?? llmErr);
      reply = "I'm having a small hiccup right now. Please try again in a moment, or I can connect you with the team—just ask.";
    }

    res.json({ reply } as ChatResponse);
  } catch (err: any) {
    console.error("[chat] error:", err?.message ?? err);
    res.status(200).json({
      reply: "I can only help with SealX questions right now. Want me to connect you with the team?",
    } as ChatResponse);
  }
});

const port = Number(process.env.PORT || 3001);
if (process.env.VERCEL !== "1") {
  app.listen(port, () => {
    console.log(`[backend] listening on http://localhost:${port}`);
  });
}

export default app;
