"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface ArxivPaper {
  id: string;
  title: string;
  authors: string[];
  summary: string;
  year: string;
  pdfUrl: string;
  arxivUrl: string;
}

export default function ArxivSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArxivPaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<(q: string) => void>(undefined);

  // Listen for "Find Related" events from PDF mini-menu
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (text && searchRef.current) {
        // Take first ~60 chars as search query
        const q = text.slice(0, 60).replace(/[^\w\s]/g, " ").trim();
        setQuery(q);
        searchRef.current(q);
      }
    };
    window.addEventListener("scribe:arxiv-search", handler);
    return () => window.removeEventListener("scribe:arxiv-search", handler);
  }, []);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/arxiv?q=${encodeURIComponent(query.trim())}&max=8`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.papers || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  searchRef.current = (q: string) => {
    setQuery(q);
    setLoading(true);
    setSearched(true);
    fetch(`/api/arxiv?q=${encodeURIComponent(q)}&max=8`)
      .then((res) => res.json())
      .then((data) => setResults(data.papers || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  };

  const insertCitation = useCallback((paper: ArxivPaper) => {
    // Format APA author
    let apaAuthor: string;
    if (paper.authors.length === 0) apaAuthor = "Unknown";
    else if (paper.authors.length === 1) apaAuthor = paper.authors[0];
    else if (paper.authors.length === 2) apaAuthor = `${paper.authors[0]} & ${paper.authors[1]}`;
    else apaAuthor = `${paper.authors[0]} et al.`;

    const citation = `(${apaAuthor}, ${paper.year})`;
    const html = `<p><em>${paper.title}</em> ${citation}</p>`;

    window.dispatchEvent(new CustomEvent("scribe:ai-insert", { detail: `${paper.title}\n\n${paper.summary}\n\nSource: ${apaAuthor} (${paper.year}). arXiv:${paper.id}` }));
  }, []);

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
            placeholder="Search arXiv papers..."
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

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {!searched && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--purple-bg)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--purple)" }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <p className="text-[11px] font-medium" style={{ color: "var(--foreground)" }}>Search arXiv</p>
            <p className="text-[10px]" style={{ color: "var(--muted)" }}>Find research papers from the global academic archive</p>
          </div>
        )}

        {searched && !loading && results.length === 0 && (
          <div className="text-center py-6">
            <p className="text-xs" style={{ color: "var(--muted)" }}>No papers found for &ldquo;{query}&rdquo;</p>
          </div>
        )}

        {results.map((paper) => {
          const isExpanded = expandedId === paper.id;
          const authorDisplay = paper.authors.length > 2
            ? `${paper.authors[0]} et al.`
            : paper.authors.join(", ");

          return (
            <div
              key={paper.id}
              className="mb-2 rounded-xl overflow-hidden transition-all"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {/* Header — always visible */}
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

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-2.5 pb-2.5">
                  <p className="text-[10px] leading-relaxed mb-2.5" style={{ color: "var(--muted)" }}>
                    {paper.summary.length > 300 ? paper.summary.slice(0, 300) + "..." : paper.summary}
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => insertCitation(paper)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-semibold transition-colors"
                      style={{ background: "var(--purple)", color: "#fff" }}
                    >
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14" /><path d="m19 12-7 7-7-7" />
                      </svg>
                      Add to Editor
                    </button>
                    <a
                      href={paper.arxivUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium no-underline transition-colors"
                      style={{ background: "var(--hover)", color: "var(--muted)" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      arXiv
                    </a>
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
      </div>
    </div>
  );
}
