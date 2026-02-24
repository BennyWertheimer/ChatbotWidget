import type { ChatMessage, ChatResponse } from "@outbound/shared";

const BACKEND_URL = "http://localhost:3001";

export async function sendChat(messages: ChatMessage[]): Promise<ChatResponse> {
  const res = await fetch(`${BACKEND_URL}/chat`, {
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

export async function submitLead(email: string, phone: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/lead`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), phone: phone.trim() })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? `Request failed: ${res.status}`);
  }
}
