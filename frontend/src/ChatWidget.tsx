import React, { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@outbound/shared";
import { sendChat, submitLead } from "./api";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadLoading, setLeadLoading] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hey, welcome to SealX. How can I help you?" }
  ]);

  const listRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, isTyping]);

  const canSend = input.trim().length > 0 && !isTyping;

  async function onSend() {
    const content = input.trim();
    if (!content || isTyping) return;

    setInput("");
    const next = [...messages, { role: "user", content } as ChatMessage];
    setMessages(next);

    setIsTyping(true);
    try {
      const res = await sendChat(next.filter(m => m.role !== "system"));
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (e: any) {
      setMessages([
        ...next,
        { role: "assistant", content: "Sorry — something went wrong talking to the server." }
      ]);
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          width: 56,
          height: 56,
          borderRadius: 999,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          background: "#111",
          color: "white",
          fontSize: 20
        }}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? "×" : "💬"}
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
                Enter your name, email, and phone number to chat with our customer assistant.
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
              {leadError && (
                <p style={{ margin: 0, fontSize: 13, color: "#c00" }}>{leadError}</p>
              )}
              <button
                onClick={async () => {
                  if (!name.trim() || !email.trim() || !phone.trim() || leadLoading) return;
                  setLeadError(null);
                  setLeadLoading(true);
                  try {
                    await submitLead(name, email, phone);
                    setStarted(true);
                  } catch (e: any) {
                    setLeadError(e?.message ?? "Couldn’t save — try again.");
                  } finally {
                    setLeadLoading(false);
                  }
                }}
                disabled={!name.trim() || !email.trim() || !phone.trim() || leadLoading}
                style={{
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  cursor: name.trim() && email.trim() && phone.trim() && !leadLoading ? "pointer" : "not-allowed",
                  background: name.trim() && email.trim() && phone.trim() && !leadLoading ? "#111" : "rgba(0,0,0,0.2)",
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
