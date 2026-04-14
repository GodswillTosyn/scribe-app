"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SHORTCUTS = [
  { category: "General", items: [
    { keys: "Ctrl + K", desc: "Command palette" },
    { keys: "Ctrl + /", desc: "Keyboard shortcuts" },
    { keys: "Ctrl + S", desc: "Export to Word" },
  ]},
  { category: "Text Formatting", items: [
    { keys: "Ctrl + B", desc: "Bold" },
    { keys: "Ctrl + I", desc: "Italic" },
    { keys: "Ctrl + U", desc: "Underline" },
    { keys: "Ctrl + Shift + X", desc: "Strikethrough" },
    { keys: "Ctrl + Shift + H", desc: "Highlight" },
  ]},
  { category: "Blocks", items: [
    { keys: "Ctrl + Shift + 1", desc: "Heading 1" },
    { keys: "Ctrl + Shift + 2", desc: "Heading 2" },
    { keys: "Ctrl + Shift + 3", desc: "Heading 3" },
    { keys: "Ctrl + Shift + 8", desc: "Bullet list" },
    { keys: "Ctrl + Shift + 9", desc: "Ordered list" },
    { keys: "Ctrl + Shift + B", desc: "Blockquote" },
  ]},
  { category: "History", items: [
    { keys: "Ctrl + Z", desc: "Undo" },
    { keys: "Ctrl + Shift + Z", desc: "Redo" },
  ]},
];

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.4)" }}
        onClick={() => setOpen(false)}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className="w-[440px] max-h-[70vh] rounded-2xl overflow-hidden flex flex-col"
          style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 h-12 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
            <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Keyboard Shortcuts</span>
            <button onClick={() => setOpen(false)} className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--hover)", color: "var(--muted)" }}>ESC</button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {SHORTCUTS.map((cat) => (
              <div key={cat.category} className="mb-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--purple)" }}>{cat.category}</div>
                {cat.items.map((item) => (
                  <div key={item.keys} className="flex items-center justify-between py-1.5">
                    <span className="text-xs" style={{ color: "var(--foreground)" }}>{item.desc}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: "var(--hover)", color: "var(--muted)" }}>{item.keys}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
