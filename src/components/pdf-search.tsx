"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export default function PdfSearch({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Range[]>([]);
  const [currentMatch, setCurrentMatch] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const highlightsRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f" && containerRef.current?.contains(document.activeElement as Node)) {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
        clearHighlights();
      }
    };
    // Listen on document to catch Ctrl+F even when PDF panel is focused
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, containerRef]);

  const clearHighlights = useCallback(() => {
    highlightsRef.current.forEach((el) => {
      el.style.background = "";
      el.style.borderRadius = "";
    });
    highlightsRef.current = [];
    setMatches([]);
    setCurrentMatch(0);
  }, []);

  const doSearch = useCallback((q: string) => {
    clearHighlights();
    if (!q.trim() || !containerRef.current) return;

    const textSpans = containerRef.current.querySelectorAll(".textLayer span");
    const found: HTMLElement[] = [];

    textSpans.forEach((span) => {
      const text = span.textContent?.toLowerCase() || "";
      if (text.includes(q.toLowerCase())) {
        const el = span as HTMLElement;
        el.style.background = "rgba(250, 204, 21, 0.5)";
        el.style.borderRadius = "2px";
        found.push(el);
      }
    });

    highlightsRef.current = found;
    setMatches([]); // Using highlights directly
    setCurrentMatch(0);

    if (found.length > 0) {
      found[0].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [containerRef, clearHighlights]);

  const goToMatch = useCallback((idx: number) => {
    const found = highlightsRef.current;
    if (found.length === 0) return;

    // Reset previous
    found.forEach((el) => {
      el.style.background = "rgba(250, 204, 21, 0.3)";
    });

    const wrappedIdx = ((idx % found.length) + found.length) % found.length;
    setCurrentMatch(wrappedIdx);
    found[wrappedIdx].style.background = "rgba(250, 204, 21, 0.7)";
    found[wrappedIdx].scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    clearHighlights();
  }, [clearHighlights]);

  if (!open) return null;

  return (
    <div
      className="absolute top-2 right-2 z-30 flex items-center gap-1.5 rounded-xl px-3 py-1.5"
      style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)" }}>
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); doSearch(e.target.value); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") goToMatch(currentMatch + (e.shiftKey ? -1 : 1));
          if (e.key === "Escape") close();
        }}
        placeholder="Search in PDF..."
        className="bg-transparent outline-none text-xs w-32"
        style={{ color: "var(--foreground)" }}
      />
      {highlightsRef.current.length > 0 && (
        <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>
          {currentMatch + 1}/{highlightsRef.current.length}
        </span>
      )}
      <button onClick={() => goToMatch(currentMatch - 1)} className="w-5 h-5 rounded flex items-center justify-center" style={{ color: "var(--muted)" }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="18 15 12 9 6 15" /></svg>
      </button>
      <button onClick={() => goToMatch(currentMatch + 1)} className="w-5 h-5 rounded flex items-center justify-center" style={{ color: "var(--muted)" }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      <button onClick={close} className="w-5 h-5 rounded flex items-center justify-center" style={{ color: "var(--muted)" }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </div>
  );
}
