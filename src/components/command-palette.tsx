"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface Command {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

export default function CommandPalette({ commands }: { commands: Command[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setSelectedIdx(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const filtered = commands.filter(
    (c) =>
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIdx]) {
      filtered[selectedIdx].action();
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh]"
        style={{ background: "rgba(0,0,0,0.4)" }}
        onClick={() => setOpen(false)}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="w-[480px] rounded-2xl overflow-hidden"
          style={{
            background: "var(--panel-bg)",
            border: "1px solid var(--border)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Input */}
          <div className="flex items-center gap-3 px-4 h-12 border-b" style={{ borderColor: "var(--border)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)" }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Type a command..."
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: "var(--foreground)" }}
            />
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--hover)", color: "var(--muted)" }}>ESC</span>
          </div>

          {/* Results */}
          <div className="max-h-[300px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs" style={{ color: "var(--muted)" }}>No results found</div>
            ) : (
              filtered.map((cmd, i) => (
                <button
                  key={cmd.id}
                  onClick={() => { cmd.action(); setOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors"
                  style={{
                    background: i === selectedIdx ? "var(--hover)" : "transparent",
                    color: "var(--foreground)",
                  }}
                  onMouseEnter={() => setSelectedIdx(i)}
                >
                  <span style={{ color: "var(--purple)" }}>{cmd.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium">{cmd.label}</div>
                    <div className="text-[10px]" style={{ color: "var(--muted)" }}>{cmd.category}</div>
                  </div>
                  {cmd.shortcut && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{ background: "var(--hover)", color: "var(--muted)" }}>{cmd.shortcut}</span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 px-4 h-9 border-t text-[10px]" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
            <span>&#8593;&#8595; Navigate</span>
            <span>&#9166; Select</span>
            <span>ESC Close</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
