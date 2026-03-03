import type { ChatMessage, ChatResponse } from "@outbound/shared";

declare global {
  interface Window {
    __SEALX_API_BASE__?: string;
  }
}

function getBase(): string {
  if (typeof window !== "undefined" && window.__SEALX_API_BASE__) return window.__SEALX_API_BASE__;
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("apiBaseUrl") ?? params.get("api");
    if (fromUrl) return fromUrl;
  }
  return import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3001";
}

const API_PREFIX = ""; // use BASE as full API root

export async function sendChat(messages: ChatMessage[]): Promise<ChatResponse> {
  const BASE = getBase();
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json() as Promise<ChatResponse>;
}

export type LeadPayload = {
  name: string;
  email: string;
  phone: string;
  transcript_id?: string;
  last_question?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
};

export function getUtmAndReferrer(): Pick<LeadPayload, "referrer" | "utm_source" | "utm_medium" | "utm_campaign"> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    referrer: document.referrer || undefined,
    utm_source: params.get("utm_source") ?? undefined,
    utm_medium: params.get("utm_medium") ?? undefined,
    utm_campaign: params.get("utm_campaign") ?? undefined,
  };
}

export async function submitLead(payload: LeadPayload): Promise<void> {
  const BASE = getBase();
  const res = await fetch(`${BASE}/lead`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? `Request failed: ${res.status}`);
  }
}
