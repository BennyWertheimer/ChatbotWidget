import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import { openai } from "./openai.js";
import { SYSTEM_PROMPT } from "./prompt.js";
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

const LeadSchema = z.object({
  email: z.string().min(1, "Email is required"),
  phone: z.string().min(1, "Phone is required")
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/lead", async (req, res) => {
  try {
    const parsed = LeadSchema.parse(req.body);
    const { error } = await supabase
      .from("chatbot_leads")
      .insert({ Email: parsed.email.trim(), Phone: parsed.phone.trim() });
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

    const messages = [
      {
        role: "system" as const,
        content: SYSTEM_PROMPT
      },
      ...parsed.messages
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages
    });

    const reply = completion.choices[0]?.message?.content?.trim() || "Sorry — I couldn’t generate a response.";

    const body: ChatResponse = { reply };
    res.json(body);
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err?.message ?? "Bad request" });
  }
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`[backend] listening on http://localhost:${port}`);
});
