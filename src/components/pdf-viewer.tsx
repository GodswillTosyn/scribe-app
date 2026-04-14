"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { motion, AnimatePresence } from "framer-motion";
import "react-pdf/dist/Page/TextLayer.css";
import PdfSearch from "./pdf-search";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface CitationPayload {
  id: string;
  text: string;
  filename: string;
  authors: string;
  year: string;
  page: number;
  posY: number;
}

interface PopoverState { x: number; y: number; payload: CitationPayload }
interface SnapshotBox { startX: number; startY: number; endX: number; endY: number; pageNum: number }

function getPageNumber(node: Node): number {
  let el: HTMLElement | null = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
  while (el) {
    const num = el.getAttribute("data-page-number");
    if (num) return parseInt(num, 10);
    el = el.parentElement;
  }
  return 1;
}

export default function PdfViewer({
  onCite, pdfData, pdfName, onPageChange, initialPage,
}: {
  onCite?: (payload: CitationPayload) => void;
  pdfData: string | null;
  pdfName: string;
  onPageChange?: (page: number) => void;
  initialPage?: number;
}) {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [autoScale, setAutoScale] = useState(1.0);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [snapshotMode, setSnapshotMode] = useState(false);
  const [snapBox, setSnapBox] = useState<SnapshotBox | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pdfKey, setPdfKey] = useState(0); // for fade-in on new PDF
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverBtnRef = useRef<HTMLDivElement>(null);

  // Re-key on PDF change for fade animation
  useEffect(() => { setPdfKey((k) => k + 1); setNumPages(0); }, [pdfData]);

  // Auto-fit
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const measure = () => {
      const w = c.clientWidth - 48;
      if (w > 0) { const fit = w / 612; setAutoScale(fit); setScale(fit); }
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(c);
    return () => obs.disconnect();
  }, [pdfData]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => setNumPages(numPages), []);

  // Goto citation
  useEffect(() => {
    const h = (e: Event) => {
      const p = (e as CustomEvent<CitationPayload>).detail;
      if (!p || !containerRef.current || (pdfName && p.filename !== pdfName)) return;
      const pageEl = containerRef.current.querySelector(`[data-page-number="${p.page}"]`);
      if (pageEl) {
        const pr = pageEl.getBoundingClientRect();
        const cr = containerRef.current.getBoundingClientRect();
        containerRef.current.scrollTo({ top: containerRef.current.scrollTop + (pr.top - cr.top) + p.posY * pr.height - cr.height / 3, behavior: "smooth" });
      }
    };
    window.addEventListener("scribe:goto-citation", h);
    return () => window.removeEventListener("scribe:goto-citation", h);
  }, [pdfName, numPages]);

  // Scroll to initial page
  useEffect(() => {
    if (!numPages || !initialPage || initialPage <= 1) return;
    const t = setTimeout(() => {
      containerRef.current?.querySelector(`[data-page-number="${initialPage}"]`)?.scrollIntoView({ behavior: "auto", block: "start" });
    }, 300);
    return () => clearTimeout(t);
  }, [numPages, initialPage, pdfData]);

  // Track visible page
  useEffect(() => {
    const c = containerRef.current;
    if (!c || !numPages) return;
    let ticking = false;
    const h = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        const pages = c.querySelectorAll("[data-page-number]");
        let vis = 1;
        const top = c.getBoundingClientRect().top;
        for (const p of pages) { if (p.getBoundingClientRect().top <= top + 100) vis = parseInt(p.getAttribute("data-page-number") || "1", 10); }
        onPageChange?.(vis);
        ticking = false;
      });
    };
    c.addEventListener("scroll", h, { passive: true });
    return () => c.removeEventListener("scroll", h);
  }, [numPages, onPageChange]);

  // Text selection (only when not in snapshot mode)
  useEffect(() => {
    if (snapshotMode) return;
    const c = containerRef.current;
    if (!c) return;
    const up = () => {
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) { setPopover(null); return; }
        const text = sel.toString().trim();
        if (text.length < 2) { setPopover(null); return; }
        const anchor = sel.anchorNode, focus = sel.focusNode;
        if (!anchor || !focus || (!c.contains(anchor) && !c.contains(focus))) { setPopover(null); return; }
        try {
          const range = sel.getRangeAt(0), rect = range.getBoundingClientRect();
          const page = getPageNumber(anchor);
          const pe = c.querySelector(`[data-page-number="${page}"]`);
          let posY = 0;
          if (pe) { const pr = pe.getBoundingClientRect(); posY = Math.max(0, Math.min(1, (rect.top - pr.top) / pr.height)); }
          setPopover({ x: rect.left + rect.width / 2, y: rect.top - 10, payload: { id: crypto.randomUUID(), text, filename: pdfName || "document.pdf", authors: "", year: "", page, posY } });
        } catch { setPopover(null); }
      }, 10);
    };
    const down = (e: MouseEvent) => { if (popoverBtnRef.current?.contains(e.target as Node)) return; setPopover(null); };
    document.addEventListener("mouseup", up);
    c.addEventListener("mousedown", down);
    return () => { document.removeEventListener("mouseup", up); c.removeEventListener("mousedown", down); };
  }, [pdfData, pdfName, snapshotMode]);

  const handleCite = useCallback(() => {
    if (!popover) return;
    onCite?.(popover.payload);
    setPopover(null);
    window.getSelection()?.removeAllRanges();
  }, [popover, onCite]);

  // ── Snapshot drawing ──
  const startSnap = (e: React.MouseEvent) => {
    if (!snapshotMode || !containerRef.current) return;
    const cr = containerRef.current.getBoundingClientRect();
    const x = e.clientX - cr.left + containerRef.current.scrollLeft;
    const y = e.clientY - cr.top + containerRef.current.scrollTop;
    // Determine which page
    const pages = containerRef.current.querySelectorAll("[data-page-number]");
    let pageNum = 1;
    for (const p of pages) {
      const pr = p.getBoundingClientRect();
      if (e.clientY >= pr.top && e.clientY <= pr.bottom) {
        pageNum = parseInt(p.getAttribute("data-page-number") || "1", 10);
        break;
      }
    }
    setSnapBox({ startX: x, startY: y, endX: x, endY: y, pageNum });
    setIsDrawing(true);
  };

  const moveSnap = (e: React.MouseEvent) => {
    if (!isDrawing || !snapBox || !containerRef.current) return;
    const cr = containerRef.current.getBoundingClientRect();
    setSnapBox({ ...snapBox, endX: e.clientX - cr.left + containerRef.current.scrollLeft, endY: e.clientY - cr.top + containerRef.current.scrollTop });
  };

  const endSnap = useCallback(() => {
    if (!isDrawing || !snapBox || !containerRef.current) { setIsDrawing(false); return; }
    setIsDrawing(false);
    const x = Math.min(snapBox.startX, snapBox.endX);
    const y = Math.min(snapBox.startY, snapBox.endY);
    const w = Math.abs(snapBox.endX - snapBox.startX);
    const h = Math.abs(snapBox.endY - snapBox.startY);
    if (w < 10 || h < 10) { setSnapBox(null); return; }

    // Find the canvas for this page
    const pageEl = containerRef.current.querySelector(`[data-page-number="${snapBox.pageNum}"]`);
    const canvas = pageEl?.querySelector("canvas");
    if (!canvas) { setSnapBox(null); return; }

    const pageRect = pageEl!.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const pageOffsetX = pageRect.left - containerRect.left + containerRef.current.scrollLeft;
    const pageOffsetY = pageRect.top - containerRect.top + containerRef.current.scrollTop;

    // Convert selection coords to canvas pixel coords
    const scaleX = canvas.width / pageRect.width;
    const scaleY = canvas.height / pageRect.height;
    const cx = (x - pageOffsetX) * scaleX;
    const cy = (y - pageOffsetY) * scaleY;
    const cw = w * scaleX;
    const ch = h * scaleY;

    // Extract region
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = Math.max(1, Math.round(cw));
    tempCanvas.height = Math.max(1, Math.round(ch));
    const ctx = tempCanvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(canvas, cx, cy, cw, ch, 0, 0, tempCanvas.width, tempCanvas.height);
      const dataUrl = tempCanvas.toDataURL("image/png");
      // Send to editor
      window.dispatchEvent(new CustomEvent("scribe:snapshot", { detail: dataUrl }));
    }
    setSnapBox(null);
    setSnapshotMode(false);
  }, [isDrawing, snapBox]);

  if (!pdfData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="flex flex-col items-center gap-4 p-10 rounded-xl border border-dashed" style={{ borderColor: "var(--purple-border)" }}>
          <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "var(--purple-bg)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--purple)" }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>No PDF loaded</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Use the + button above to add a PDF</p>
        </div>
      </div>
    );
  }

  const snapRect = snapBox ? {
    left: Math.min(snapBox.startX, snapBox.endX),
    top: Math.min(snapBox.startY, snapBox.endY),
    width: Math.abs(snapBox.endX - snapBox.startX),
    height: Math.abs(snapBox.endY - snapBox.startY),
  } : null;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-b shrink-0" style={{ borderColor: "var(--border)", background: "var(--toolbar-bg)" }}>
        <button onClick={() => setScale((s) => Math.max(0.3, s - 0.1))} className="flex items-center justify-center w-7 h-7 rounded transition-colors" style={{ color: "var(--muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
        <button onClick={() => setScale(autoScale)} className="text-xs tabular-nums min-w-[3rem] text-center font-medium rounded transition-colors" style={{ color: "var(--muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")} title="Fit to width">
          {Math.round(scale * 100)}%
        </button>
        <button onClick={() => setScale((s) => Math.min(3, s + 0.1))} className="flex items-center justify-center w-7 h-7 rounded transition-colors" style={{ color: "var(--muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
        <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />
        {/* Snapshot tool */}
        <button
          onClick={() => { setSnapshotMode(!snapshotMode); setSnapBox(null); }}
          className="flex items-center gap-1 px-2 h-7 rounded text-[11px] font-medium transition-colors"
          style={{ color: snapshotMode ? "#fff" : "var(--muted)", background: snapshotMode ? "var(--purple)" : "transparent" }}
          onMouseEnter={(e) => { if (!snapshotMode) e.currentTarget.style.background = "var(--hover)"; }}
          onMouseLeave={(e) => { if (!snapshotMode) e.currentTarget.style.background = "transparent"; }}
          title="Snapshot: drag to capture area"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
          </svg>
          Snap
        </button>
        <div className="flex-1" />
        <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>{numPages} page{numPages !== 1 ? "s" : ""}</span>
      </div>

      {/* Pages */}
      <div
        ref={containerRef}
        data-pdf-container
        className="flex-1 overflow-auto relative"
        style={{ background: "var(--surface)", cursor: snapshotMode ? "crosshair" : "auto" }}
        onMouseDown={snapshotMode ? startSnap : undefined}
        onMouseMove={snapshotMode ? moveSnap : undefined}
        onMouseUp={snapshotMode ? endSnap : undefined}
      >
        <PdfSearch containerRef={containerRef} />
        <AnimatePresence mode="wait">
          <motion.div
            key={pdfKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center py-6 gap-6"
          >
            <Document file={pdfData} onLoadSuccess={onDocumentLoadSuccess}>
              {Array.from({ length: numPages }, (_, i) => (
                <Page key={i + 1} pageNumber={i + 1} scale={scale} className="shadow-sm rounded-sm overflow-hidden" renderTextLayer={true} renderAnnotationLayer={false} />
              ))}
            </Document>
          </motion.div>
        </AnimatePresence>

        {/* Snapshot selection rectangle */}
        {snapRect && isDrawing && (
          <div className="snapshot-overlay" style={{ left: snapRect.left, top: snapRect.top, width: snapRect.width, height: snapRect.height }} />
        )}
      </div>

      {/* Selection mini-menu: Cite + AI actions */}
      {popover && !snapshotMode && (
        <div ref={popoverBtnRef} className="fixed z-[9999]" style={{ left: popover.x, top: popover.y, transform: "translate(-50%, -100%)" }}>
          <div className="flex items-center gap-0.5 rounded-xl p-1" style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(109,40,217,0.08)" }}>
            <button onClick={handleCite} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap"
              style={{ background: "var(--purple)", color: "#fff" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--purple-soft)")} onMouseLeave={(e) => (e.currentTarget.style.background = "var(--purple)")}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" /></svg>
              Cite
            </button>
            <button onClick={() => { const t = popover.payload.text; setPopover(null); window.getSelection()?.removeAllRanges(); window.dispatchEvent(new CustomEvent("scribe:ai-ask", { detail: { prompt: `Summarize this text concisely:\n\n"${t}"`, text: t } })); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap" style={{ color: "var(--muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="url(#pmg1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><defs><linearGradient id="pmg1" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor="#7C3AED" /><stop offset="100%" stopColor="#3B82F6" /></linearGradient></defs><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
              Summarize
            </button>
            <button onClick={() => { const t = popover.payload.text; setPopover(null); window.getSelection()?.removeAllRanges(); window.dispatchEvent(new CustomEvent("scribe:ai-ask", { detail: { prompt: `Explain this in simple terms:\n\n"${t}"`, text: t } })); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap" style={{ color: "var(--muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="url(#pmg2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><defs><linearGradient id="pmg2" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor="#7C3AED" /><stop offset="100%" stopColor="#3B82F6" /></linearGradient></defs><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              Explain
            </button>
          </div>
          <div className="w-2.5 h-2.5 rotate-45 mx-auto -mt-[5px]" style={{ background: "var(--panel-bg)", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }} />
        </div>
      )}
    </div>
  );
}
