"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage } from "@/lib/db";

function ShimmerLoader() {
  return (
    <div className="flex gap-1.5 items-center px-3 py-2">
      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--purple)", animationDelay: "0ms" }} />
      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--purple)", animationDelay: "150ms" }} />
      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--purple)", animationDelay: "300ms" }} />
    </div>
  );
}

export default function AiChat({
  chatHistory,
  onUpdateHistory,
  getContext,
}: {
  chatHistory: ChatMessage[];
  onUpdateHistory: (msgs: ChatMessage[]) => void;
  getContext: () => string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(chatHistory);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sendRef = useRef<(text: string) => void>(undefined);

  // Sync from parent on mount, scroll to latest
  useEffect(() => {
    setMessages(chatHistory);
    // Scroll to bottom after messages load
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  }, [chatHistory]);

  // Listen for AI ask events from the PDF mini-menu
  useEffect(() => {
    const handleAsk = (e: Event) => {
      const { prompt } = (e as CustomEvent<{ prompt: string; text: string }>).detail;
      if (prompt && sendRef.current) {
        sendRef.current(prompt);
      }
    };
    window.addEventListener("scribe:ai-ask", handleAsk);
    return () => window.removeEventListener("scribe:ai-ask", handleAsk);
  }, []);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: text.trim(),
      timestamp: Date.now(),
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setStreaming(true);
    setStreamText("");
    scrollToBottom();

    try {
      const context = getContext();
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text.trim(),
          context,
          chatHistory: updated.slice(-10).map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `AI request failed (${res.status})`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setStreamText(fullText);
          scrollToBottom();
        }
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: fullText,
        timestamp: Date.now(),
      };

      const final = [...updated, assistantMsg];
      setMessages(final);
      onUpdateHistory(final);
      setStreamText("");
    } catch (err) {
      const errorText = err instanceof Error ? err.message : "Unknown error";
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: `Error: ${errorText}`,
        timestamp: Date.now(),
      };
      const final = [...updated, errMsg];
      setMessages(final);
      onUpdateHistory(final);
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming, getContext, onUpdateHistory]);

  // Keep ref in sync so event listener can call it
  sendRef.current = sendMessage;

  const pushToEditor = useCallback((text: string) => {
    window.dispatchEvent(new CustomEvent("scribe:ai-insert", { detail: text }));
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    onUpdateHistory([]);
  }, [onUpdateHistory]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.1), rgba(59,130,246,0.1))" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="url(#ai-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <defs><linearGradient id="ai-grad" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor="#7C3AED" /><stop offset="100%" stopColor="#3B82F6" /></linearGradient></defs>
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <p className="text-[11px] font-medium" style={{ color: "var(--foreground)" }}>Scribe AI</p>
            <p className="text-[10px] max-w-[180px]" style={{ color: "var(--muted)" }}>
              Ask questions about your PDFs. I&apos;ll cite page numbers and never guess.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`mb-3 ${msg.role === "user" ? "flex justify-end" : ""}`}>
            <div
              className="rounded-xl px-3 py-2 text-[12px] leading-relaxed max-w-[95%]"
              style={{
                background: msg.role === "user" ? "var(--purple)" : "var(--hover)",
                color: msg.role === "user" ? "#fff" : "var(--foreground)",
              }}
            >
              <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
              {msg.role === "assistant" && (
                <button
                  onClick={() => pushToEditor(msg.text)}
                  className="flex items-center gap-1 mt-2 text-[9px] font-medium px-2 py-1 rounded-md transition-colors"
                  style={{ background: "var(--purple-bg)", color: "var(--purple)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--purple-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--purple-bg)")}
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14" /><path d="m19 12-7 7-7-7" />
                  </svg>
                  Push to Editor
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Streaming response */}
        {streaming && (
          <div className="mb-3">
            <div className="rounded-xl px-3 py-2 text-[12px] leading-relaxed max-w-[95%]" style={{ background: "var(--hover)", color: "var(--foreground)" }}>
              {streamText ? (
                <div style={{ whiteSpace: "pre-wrap" }}>{streamText}<span className="animate-pulse">|</span></div>
              ) : (
                <ShimmerLoader />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Clear button */}
      {messages.length > 0 && (
        <div className="px-3 pb-1">
          <button onClick={clearChat} className="text-[9px] px-2 py-0.5 rounded transition-colors" style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            Clear chat
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3">
        <div className="flex gap-2 rounded-xl p-1.5 border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Ask about your PDFs..."
            rows={1}
            className="flex-1 bg-transparent outline-none text-[12px] resize-none px-2 py-1.5"
            style={{ color: "var(--foreground)" }}
            disabled={streaming}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={streaming || !input.trim()}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all disabled:opacity-30 shrink-0"
            style={{ background: "linear-gradient(135deg, #7C3AED, #3B82F6)", color: "#fff" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
