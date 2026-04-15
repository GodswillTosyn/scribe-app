"use client";

import { useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";

interface GrammarMatch {
  message: string;
  offset: number;
  length: number;
  replacements: { value: string }[];
  context: { text: string; offset: number; length: number };
}

export default function GrammarCheck({ editor, onClose }: { editor: TiptapEditor; onClose: () => void }) {
  const [matches, setMatches] = useState<GrammarMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const runCheck = async () => {
    const text = editor.getText();
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/grammar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setMatches(data.matches || []);
      setChecked(true);
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (match: GrammarMatch, replacement: string) => {
    const text = editor.getText();
    const before = text.slice(0, match.offset);
    const after = text.slice(match.offset + match.length);
    const newText = before + replacement + after;
    editor.chain().focus().setContent(`<p>${newText.replace(/\n/g, "</p><p>")}</p>`).run();
    setMatches((prev) => prev.filter((m) => m !== match));
  };

  return (
    <div
      className="absolute top-full right-0 mt-1 rounded-xl shadow-lg border z-50 overflow-hidden"
      style={{ background: "var(--panel-bg)", borderColor: "var(--border)", width: "320px", maxHeight: "400px" }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-[11px] font-medium" style={{ color: "var(--foreground)" }}>Grammar Check</span>
        <div className="flex items-center gap-1">
          <button
            onClick={runCheck}
            disabled={loading}
            className="text-[10px] px-2 py-1 rounded-md font-medium transition-colors"
            style={{ background: "var(--purple)", color: "#fff", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Checking..." : "Check Grammar"}
          </button>
          <button onClick={onClose} className="flex items-center justify-center w-5 h-5 rounded transition-colors" style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: "340px" }}>
        {!checked && !loading && (
          <div className="px-3 py-4 text-center text-[11px]" style={{ color: "var(--muted)" }}>
            Click &quot;Check Grammar&quot; to analyze your text.
          </div>
        )}
        {checked && matches.length === 0 && (
          <div className="px-3 py-4 text-center text-[11px]" style={{ color: "var(--muted)" }}>
            No grammar issues found.
          </div>
        )}
        {matches.map((m, i) => (
          <div key={i} className="px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-[11px] mb-1" style={{ color: "var(--foreground)" }}>{m.message}</p>
            <p className="text-[10px] mb-1.5" style={{ color: "var(--muted)" }}>
              &quot;...{m.context.text.slice(Math.max(0, m.context.offset - 10), m.context.offset)}
              <span style={{ background: "rgba(239,68,68,0.2)", borderRadius: "2px", padding: "0 2px" }}>
                {m.context.text.slice(m.context.offset, m.context.offset + m.context.length)}
              </span>
              {m.context.text.slice(m.context.offset + m.context.length, m.context.offset + m.context.length + 10)}...&quot;
            </p>
            <div className="flex flex-wrap gap-1">
              {m.replacements.slice(0, 3).map((r, j) => (
                <button
                  key={j}
                  onClick={() => applySuggestion(m, r.value)}
                  className="text-[10px] px-2 py-0.5 rounded transition-colors"
                  style={{ background: "var(--purple-bg)", color: "var(--purple)", border: "1px solid var(--purple-border)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--purple-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--purple-bg)")}
                >
                  {r.value}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
