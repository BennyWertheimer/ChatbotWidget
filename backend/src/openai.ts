import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY_WEBSITE_CHAT;
if (!apiKey) {
  throw new Error("Missing OPENAI_API_KEY_WEBSITE_CHAT in backend/.env");
}

export const openai = new OpenAI({ apiKey });
