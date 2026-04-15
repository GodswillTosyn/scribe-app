"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import toast from "react-hot-toast";

interface ArxivPaper {
  id: string;
  title: string;
  authors: string[];
  summary: string;
  year: string;
  pdfUrl: string;
  arxivUrl: string;
}

interface SearchHistoryItem {
  query: string;
  timestamp: number;
  resultCount: number;
}

export default function ArxivSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArxivPaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingPdf, setAddingPdf] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<(q: string) => void>(undefined);

  // Load search history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("scribe-paper-search-history");
      if (stored) setSearchHistory(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const saveHistory = useCallback((items: SearchHistoryItem[]) => {
    setSearchHistory(items);
    localStorage.setItem("scribe-paper-search-history", JSON.stringify(items));
  }, []);

  // Listen for "Find Papers" events from PDF mini-menu
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (text && searchRef.current) {
        const q = text.slice(0, 60).replace(/[^\w\s]/g, " ").trim();
        setQuery(q);
        searchRef.current(q);
      }
    };
    window.addEventListener("scribe:arxiv-search", handler);
    return () => window.removeEventListener("scribe:arxiv-search", handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/arxiv?q=${encodeURIComponent(q.trim())}&max=8`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      const papers = data.papers || [];
      setResults(papers);

      // Save to history (deduplicate, max 10)
      setSearchHistory((prev) => {
        const filtered = prev.filter((h) => h.query.toLowerCase() !== q.toLowerCase());
        const updated = [{ query: q.trim(), timestamp: Date.now(), resultCount: papers.length }, ...filtered].slice(0, 10);
        localStorage.setItem("scribe-paper-search-history", JSON.stringify(updated));
        return updated;
      });
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback(() => doSearch(query), [query, doSearch]);

  searchRef.current = (q: string) => {
    setQuery(q);
    doSearch(q);
  };

  const addToSources = useCallback(async (paper: ArxivPaper) => {
    setAddingPdf(paper.id);
    try {
      // Download the PDF via our proxy to avoid CORS
      const res = await fetch(paper.pdfUrl);
      if (!res.ok) throw new Error("Failed to download PDF");
      const blob = await res.blob();
      const file = new File([blob], `${paper.title.slice(0, 60).replace(/[^\w\s]/g, "")}.pdf`, { type: "application/pdf" });

      // Format authors for APA
      let authors: string;
      if (paper.authors.length === 0) authors = "Unknown";
      else if (paper.authors.length === 1) authors = paper.authors[0];
      else if (paper.authors.length === 2) authors = `${paper.authors[0]} & ${paper.authors[1]}`;
      else authors = `${paper.authors[0]} et al.`;

      // Set pending metadata and dispatch add event
      if (typeof window !== "undefined") {
        window.__scribePendingMeta = { authors, year: paper.year };
      }
      window.dispatchEvent(new CustomEvent("scribe:add-pdf-file", { detail: file }));
      toast.success(`"${paper.title.slice(0, 40)}..." added to Sources`);
    } catch {
      toast.error("Couldn't download this PDF — try the PDF link directly");
    } finally {
      setAddingPdf(null);
    }
  }, []);

  const insertCitation = useCallback((paper: ArxivPaper) => {
    let apaAuthor: string;
    if (paper.authors.length === 0) apaAuthor = "Unknown";
    else if (paper.authors.length === 1) apaAuthor = paper.authors[0];
    else if (paper.authors.length === 2) apaAuthor = `${paper.authors[0]} & ${paper.authors[1]}`;
    else apaAuthor = `${paper.authors[0]} et al.`;
    window.dispatchEvent(new CustomEvent("scribe:ai-insert", { detail: `${paper.title}\n\n${paper.summary}\n\nSource: ${apaAuthor} (${paper.year}). arXiv:${paper.id}` }));
  }, []);

  const clearHistory = useCallback(() => {
    saveHistory([]);
  }, [saveHistory]);

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex gap-1.5 rounded-xl p-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Search academic papers..."
            className="flex-1 bg-transparent outline-none text-[12px] px-2 py-1.5"
            style={{ color: "var(--foreground)" }}
          />
          <button
            onClick={search}
            disabled={loading || !query.trim()}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all disabled:opacity-30 shrink-0"
            style={{ background: "var(--purple)", color: "#fff" }}
          >
            {loading ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Results / History */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {/* Empty state with search history */}
        {!searched && (
          <div>
            {searchHistory.length > 0 ? (
              <div>
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)", opacity: 0.6 }}>Recent Searches</span>
                  <button onClick={clearHistory} className="text-[9px] transition-colors" style={{ color: "var(--muted)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}>
                    Clear
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  {searchHistory.map((h, i) => (
                    <button
                      key={`${h.query}-${i}`}
                      onClick={() => { setQuery(h.query); doSearch(h.query); }}
                      className="flex items-center gap-2 w-full text-left px-2.5 py-2 rounded-lg transition-colors"
                      style={{ color: "var(--foreground)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)", opacity: 0.5 }}>
                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium truncate">{h.query}</div>
                        <div className="text-[9px]" style={{ color: "var(--muted)" }}>{h.resultCount} results &middot; {formatTime(h.timestamp)}</div>
                      </div>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)", opacity: 0.3 }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--purple-bg)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--purple)" }}>
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <p className="text-[11px] font-medium" style={{ color: "var(--foreground)" }}>Search Papers</p>
                <p className="text-[10px]" style={{ color: "var(--muted)" }}>Find research papers from millions of academic publications</p>
              </div>
            )}
          </div>
        )}

        {searched && !loading && results.length === 0 && (
          <div className="text-center py-6">
            <p className="text-xs" style={{ color: "var(--muted)" }}>No papers found for &ldquo;{query}&rdquo;</p>
          </div>
        )}

        {results.map((paper) => {
          const isExpanded = expandedId === paper.id;
          const isAdding = addingPdf === paper.id;
          const authorDisplay = paper.authors.length > 2
            ? `${paper.authors[0]} et al.`
            : paper.authors.join(", ");

          return (
            <div
              key={paper.id}
              className="mb-2 rounded-xl overflow-hidden transition-all"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : paper.id)}
                className="w-full text-left p-2.5"
              >
                <div className="text-[11px] font-semibold leading-snug mb-1" style={{ color: "var(--foreground)" }}>
                  {paper.title}
                </div>
                <div className="flex items-center gap-1.5 text-[9px]" style={{ color: "var(--muted)" }}>
                  <span>{authorDisplay}</span>
                  <span style={{ opacity: 0.3 }}>&middot;</span>
                  <span>{paper.year}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-2.5 pb-2.5">
                  <p className="text-[10px] leading-relaxed mb-2.5" style={{ color: "var(--muted)" }}>
                    {paper.summary.length > 300 ? paper.summary.slice(0, 300) + "..." : paper.summary}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {/* Primary: Add to Sources */}
                    <button
                      onClick={() => addToSources(paper)}
                      disabled={isAdding}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-semibold transition-colors disabled:opacity-50"
                      style={{ background: "var(--purple)", color: "#fff" }}
                    >
                      {isAdding ? (
                        <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      )}
                      Add to Sources
                    </button>
                    <button
                      onClick={() => insertCitation(paper)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium transition-colors"
                      style={{ background: "var(--hover)", color: "var(--foreground)" }}
                    >
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14" /><path d="m19 12-7 7-7-7" />
                      </svg>
                      Insert Summary
                    </button>
                    <a
                      href={paper.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium no-underline transition-colors"
                      style={{ background: "var(--hover)", color: "var(--muted)" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      PDF
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Back to history link when showing results */}
        {searched && results.length > 0 && searchHistory.length > 1 && (
          <button
            onClick={() => { setSearched(false); setResults([]); setQuery(""); }}
            className="flex items-center gap-1 w-full px-2 py-2 mt-1 rounded-lg text-[10px] font-medium transition-colors"
            style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Back to search history
          </button>
        )}
      </div>
    </div>
  );
}
