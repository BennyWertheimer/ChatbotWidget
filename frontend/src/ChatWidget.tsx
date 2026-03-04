import React, { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@outbound/shared";
import { sendChat, submitLead, getUtmAndReferrer } from "./api";

export type WidgetLauncherConfig = {
  primaryColor?: string;
  launcherText?: string;
  greetingText?: string;
  avatarUrl?: string;
};

const DEFAULT_LAUNCHER_CONFIG: Required<WidgetLauncherConfig> = {
  primaryColor: "#a85c41",
  launcherText: "Text us",
  greetingText: "Hi there, have a question? Text us here.",
  avatarUrl: "https://ui-avatars.com/api/?name=Chat&size=80&background=e8e4e0&color=6b5b52",
};

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function getLauncherConfig(overrides?: WidgetLauncherConfig | null): Required<WidgetLauncherConfig> {
  if (typeof window !== "undefined" && (window as unknown as { __SEALX_CONFIG__?: WidgetLauncherConfig }).__SEALX_CONFIG__) {
    const w = (window as unknown as { __SEALX_CONFIG__: WidgetLauncherConfig }).__SEALX_CONFIG__;
    return { ...DEFAULT_LAUNCHER_CONFIG, ...w };
  }
  return { ...DEFAULT_LAUNCHER_CONFIG, ...overrides };
}

function validateEmail(email: string): boolean {
  const s = email.trim();
  const at = s.indexOf("@");
  return at > 0 && at < s.length - 1 && s.length >= 3;
}

function validatePhone(phone: string): { valid: boolean; digits: string } {
  const digits = phone.replace(/\s|\(|\)|-|\./g, "");
  return { valid: /^\d{10}$/.test(digits), digits };
}

function getSessionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "s-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

export function ChatWidget(props?: { launcherConfig?: WidgetLauncherConfig | null }) {
  const launcherConfig = getLauncherConfig(props?.launcherConfig);
  const sessionIdRef = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [greetingDismissed, setGreetingDismissed] = useState(false);
  const [started, setStarted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadLoading, setLeadLoading] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [handoffOffered, setHandoffOffered] = useState(false);
  const [handoffDeclined, setHandoffDeclined] = useState(false);
  const [showHandoffForm, setShowHandoffForm] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hey, welcome to SealX. How can I help you?" },
  ]);

  const listRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, isTyping, showHandoffForm]);

  const canSend = input.trim().length > 0 && !isTyping;
  const lastAssistantContent = [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";
  const showHandoffCta =
    started &&
    !showHandoffForm &&
    !handoffDeclined &&
    (handoffOffered || /connect you with the team/i.test(lastAssistantContent));

  if (!sessionIdRef.current) sessionIdRef.current = getSessionId();

  async function onSend() {
    const content = input.trim();
    if (!content || isTyping) return;

    setInput("");
    setLastUserMessage(content);
    const next = [...messages, { role: "user", content } as ChatMessage];
    setMessages(next);

    setIsTyping(true);
    try {
      const res = await sendChat(next.filter((m) => m.role !== "system"));
      setMessages([...next, { role: "assistant", content: res.reply }]);
      if (/connect you with the team/i.test(res.reply)) setHandoffOffered(true);
    } catch (e: any) {
      setMessages([
        ...next,
        { role: "assistant", content: "Sorry — something went wrong talking to the server." },
      ]);
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  }

  async function doSubmitLead(isHandoff: boolean) {
    if (!validateEmail(email)) {
      setLeadError("Please enter a valid email (e.g. you@example.com).");
      return;
    }
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) {
      setLeadError("Phone must be exactly 10 digits (spaces and dashes are ok).");
      return;
    }
    setLeadError(null);
    setLeadLoading(true);
    try {
      await submitLead({
        name: name.trim(),
        email: email.trim(),
        phone: phoneCheck.digits,
        transcript_id: sessionIdRef.current ?? undefined,
        last_question: isHandoff ? lastUserMessage : undefined,
        ...getUtmAndReferrer(),
      });
      if (isHandoff) setShowHandoffForm(false);
      else setStarted(true);
    } catch (e: any) {
      setLeadError(e?.message ?? "Could not save. Try again.");
    } finally {
      setLeadLoading(false);
    }
  }

  const openChat = () => setOpen(true);

  return (
    <>
      {!open && !greetingDismissed && (
        <div className="sealx-greeting-bubble" style={{ position: "fixed", right: 20, bottom: 72, zIndex: 9998, maxWidth: "calc(100vw - 40px)" }}>
          <div
            style={{
              background: "white",
              borderRadius: 16,
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => setGreetingDismissed(true)}
              aria-label="Dismiss"
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 24,
                height: 24,
                borderRadius: 999,
                border: "none",
                background: "rgba(0,0,0,0.06)",
                color: "rgba(0,0,0,0.5)",
                fontSize: 16,
                lineHeight: 1,
                cursor: "pointer",
              }}
            >
              ×
            </button>
            <img
              src={launcherConfig.avatarUrl}
              alt=""
              width={48}
              height={48}
              style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            />
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.3, paddingRight: 20 }}>
              {launcherConfig.greetingText}
            </p>
            <div className="sealx-greeting-tail" />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="sealx-launcher-button"
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          padding: "12px 20px",
          borderRadius: 999,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
          background: launcherConfig.primaryColor,
          color: "white",
          fontSize: 15,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 10,
          zIndex: 9999,
        }}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? (
          <span style={{ fontSize: 22, lineHeight: 1 }}>×</span>
        ) : (
          <>
            <ChatIcon />
            {launcherConfig.launcherText}
          </>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            right: 20,
            bottom: 88,
            width: 360,
            maxWidth: "calc(100vw - 40px)",
            height: 520,
            maxHeight: "calc(100vh - 140px)",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
            border: "1px solid rgba(0,0,0,0.1)",
            background: "white",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div style={{ fontWeight: 650 }}>Chat</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>Prototype</div>
          </div>

          {!started ? (
            <div
              style={{
                padding: 20,
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                justifyContent: "center"
              }}
            >
              <p style={{ margin: 0, fontSize: 14, color: "rgba(0,0,0,0.7)", textAlign: "center" }}>
                Enter your name, email, and phone number to chat. We need a valid email (with @) and a 10-digit phone number.
              </p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                type="text"
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.15)",
                  outline: "none",
                  fontSize: 14
                }}
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                type="email"
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.15)",
                  outline: "none",
                  fontSize: 14
                }}
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                type="tel"
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.15)",
                  outline: "none",
                  fontSize: 14
                }}
              />
              <p style={{ margin: 0, fontSize: 12, color: "rgba(0,0,0,0.6)" }}>
                By entering this information you are consenting for us to reach out to you.
              </p>
              {leadError && (
                <p style={{ margin: 0, fontSize: 13, color: "#c00" }}>{leadError}</p>
              )}
              <button
                onClick={async () => {
                  if (!name.trim() || !validateEmail(email) || !validatePhone(phone).valid || leadLoading) return;
                  setLeadError(null);
                  setLeadLoading(true);
                  try {
                    await doSubmitLead(false);
                    setStarted(true);
                  } catch (e: any) {
                    setLeadError(e?.message ?? "Couldn’t save — try again.");
                  } finally {
                    setLeadLoading(false);
                  }
                }}
                disabled={!name.trim() || !validateEmail(email) || !validatePhone(phone).valid || leadLoading}
                style={{
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  cursor: name.trim() && validateEmail(email) && validatePhone(phone).valid && !leadLoading ? "pointer" : "not-allowed",
                  background: name.trim() && validateEmail(email) && validatePhone(phone).valid && !leadLoading ? "#111" : "rgba(0,0,0,0.2)",
                  color: "white",
                  fontWeight: 600,
                  marginTop: 4
                }}
              >
                {leadLoading ? "Saving…" : "Start chat"}
              </button>
            </div>
          ) : (
            <>
              <div
                ref={listRef}
                style={{
                  padding: 12,
                  flex: 1,
                  overflow: "auto",
                  background: "rgba(0,0,0,0.02)"
                }}
              >
                {messages.map((m, idx) => (
                  <MessageBubble key={idx} role={m.role} content={m.content} />
                ))}
                {isTyping && <MessageBubble role="assistant" content="…" />}
                {showHandoffCta && !showHandoffForm && (
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setShowHandoffForm(true)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 10,
                        border: "none",
                        background: "#111",
                        color: "white",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Yes, connect me
                    </button>
                    <button
                      type="button"
                      onClick={() => setHandoffDeclined(true)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 10,
                        border: "1px solid rgba(0,0,0,0.2)",
                        background: "transparent",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      No thanks
                    </button>
                  </div>
                )}
                {showHandoffForm && (
                  <div style={{ marginTop: 12, padding: 12, background: "rgba(0,0,0,0.04)", borderRadius: 10 }}>
                    <p style={{ margin: "0 0 8px", fontSize: 13 }}>By entering this information you are consenting for us to reach out to you.</p>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" style={{ width: "100%", marginBottom: 6, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.15)" }} />
                    <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" style={{ width: "100%", marginBottom: 6, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.15)" }} />
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (10 digits)" type="tel" style={{ width: "100%", marginBottom: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.15)" }} />
                    {leadError && <p style={{ margin: "0 0 8px", fontSize: 12, color: "#c00" }}>{leadError}</p>}
                    <button type="button" onClick={() => doSubmitLead(true)} disabled={leadLoading} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#111", color: "white", cursor: leadLoading ? "not-allowed" : "pointer" }}>
                      {leadLoading ? "Saving…" : "Submit"}
                    </button>
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: 10,
                  borderTop: "1px solid rgba(0,0,0,0.08)",
                  display: "flex",
                  gap: 8
                }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSend();
                  }}
                  placeholder="Type a message…"
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.15)",
                    outline: "none"
                  }}
                />
                <button
                  onClick={onSend}
                  disabled={!canSend}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "none",
                    cursor: canSend ? "pointer" : "not-allowed",
                    background: canSend ? "#111" : "rgba(0,0,0,0.2)",
                    color: "white",
                    fontWeight: 600
                  }}
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function MessageBubble({ role, content }: { role: ChatMessage["role"]; content: string }) {
  const isUser = role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 10 }}>
      <div
        style={{
          maxWidth: "85%",
          padding: "10px 12px",
          borderRadius: 14,
          whiteSpace: "pre-wrap",
          lineHeight: 1.25,
          background: isUser ? "#111" : "white",
          color: isUser ? "white" : "#111",
          border: isUser ? "none" : "1px solid rgba(0,0,0,0.08)"
        }}
      >
        {content}
      </div>
    </div>
  );
}
