import type { ChatMessage, ChatResponse } from "@outbound/shared";

const BASE = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3001";
const API_PREFIX = BASE ? "" : "/api";

export async function sendChat(messages: ChatMessage[]): Promise<ChatResponse> {
  const res = await fetch(`${BASE}${API_PREFIX}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json() as Promise<ChatResponse>;
}

export async function submitLead(name: string, email: string, phone: string): Promise<void> {
  const res = await fetch(`${BASE}${API_PREFIX}/lead`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? `Request failed: ${res.status}`);
  }
}
