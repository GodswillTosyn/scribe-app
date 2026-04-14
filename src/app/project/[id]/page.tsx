"use client";

import { use, useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { db, type CitationRecord, type ChatMessage } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import type { CitationPayload } from "@/components/pdf-viewer";
import toast from "react-hot-toast";

const PdfViewer = dynamic(() => import("@/components/pdf-viewer"), { ssr: false });
const PdfLibrary = dynamic(() => import("@/components/pdf-library"), { ssr: false });
const Editor = dynamic(() => import("@/components/editor"), { ssr: false });
const ThemeToggle = dynamic(() => import("@/components/theme-toggle"), { ssr: false });
const CommandPalette = dynamic(() => import("@/components/command-palette"), { ssr: false });
const KeyboardShortcuts = dynamic(() => import("@/components/keyboard-shortcuts"), { ssr: false });

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const project = useLiveQuery(() => db.projects.get(id), [id]);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [showLibrary, setShowLibrary] = useState(true);
  const [panelWidth, setPanelWidth] = useState(30);
  const [isResizing, setIsResizing] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [draggingFile, setDraggingFile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (project) setNameValue(project.name); }, [project?.name]);

  // Resizable panel
  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setPanelWidth(Math.max(15, Math.min(50, pct)));
    };
    const handleUp = () => setIsResizing(false);
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  // Focus mode shortcut
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") { e.preventDefault(); setFocusMode((f) => !f); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const handleAddPdf = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const pdfId = crypto.randomUUID();
      const meta = typeof window !== "undefined" && window.__scribePendingMeta ? window.__scribePendingMeta : { authors: "", year: "" };
      if (typeof window !== "undefined") delete window.__scribePendingMeta;
      const newPdf = { id: pdfId, name: file.name, data: base64, authors: meta.authors, year: meta.year, lastPage: 1 };
      if (project) {
        await db.projects.update(id, { pdfs: [...project.pdfs, newPdf], activePdfId: pdfId, updatedAt: Date.now() });
        toast.success(`${file.name} added`);
      }
    };
    reader.readAsDataURL(file);
  }, [project, id]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDraggingFile(true); }, []);
  const handleDragLeave = useCallback(() => setDraggingFile(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDraggingFile(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") handleAddPdf(file);
  }, [handleAddPdf]);

  const handleCite = useCallback((payload: CitationPayload) => {
    if (!project) return;
    const ap = project.pdfs.find((p) => p.id === project.activePdfId);
    const al = ap?.authors?.split(/[,;&]+/).map((a) => a.trim()).filter(Boolean) || [];
    let fa: string;
    if (al.length === 1) fa = al[0];
    else if (al.length === 2) fa = `${al[0]} & ${al[1]}`;
    else if (al.length > 2) fa = `${al[0]} et al.`;
    else fa = payload.filename.replace(/\.pdf$/i, "");
    const enriched: CitationPayload = { ...payload, authors: fa, year: ap?.year || "n.d." };
    window.dispatchEvent(new CustomEvent("scribe:cite", { detail: enriched }));
    db.projects.update(id, {
      citations: [...(project.citations || []), { id: enriched.id, text: enriched.text, filename: enriched.filename, authors: enriched.authors, year: enriched.year, page: enriched.page, posY: enriched.posY }],
      updatedAt: Date.now(),
    });
    toast.success("Citation inserted");
  }, [project, id]);

  const handleSelectPdf = useCallback((pdfId: string) => { db.projects.update(id, { activePdfId: pdfId, updatedAt: Date.now() }); setShowLibrary(false); }, [id]);

  const handleRemovePdfs = useCallback((pdfIds: string[]) => {
    if (!project) return;
    const remaining = project.pdfs.filter((p) => !pdfIds.includes(p.id));
    db.projects.update(id, { pdfs: remaining, activePdfId: pdfIds.includes(project.activePdfId) ? (remaining[0]?.id || "") : project.activePdfId, updatedAt: Date.now() });
    toast.success("PDF removed");
  }, [project, id]);

  const handleUpdatePdfMeta = useCallback((pdfId: string, authors: string, year: string) => {
    if (!project) return;
    db.projects.update(id, { pdfs: project.pdfs.map((p) => p.id === pdfId ? { ...p, authors, year } : p), updatedAt: Date.now() });
  }, [project, id]);

  const handlePageChange = useCallback((pdfId: string, page: number) => {
    if (!project) return;
    db.projects.update(id, { pdfs: project.pdfs.map((p) => p.id === pdfId ? { ...p, lastPage: page } : p), updatedAt: Date.now() });
  }, [project, id]);

  useEffect(() => {
    const h = (e: Event) => {
      const payload = (e as CustomEvent<CitationPayload>).detail;
      if (!payload || !project) return;
      const match = project.pdfs.find((p) => p.name === payload.filename);
      if (match) { if (match.id !== project.activePdfId) db.projects.update(id, { activePdfId: match.id, updatedAt: Date.now() }); setShowLibrary(false); }
    };
    window.addEventListener("scribe:goto-citation", h);
    return () => window.removeEventListener("scribe:goto-citation", h);
  }, [project, id]);

  const handleContentChange = useCallback((html: string) => { db.projects.update(id, { content: html, updatedAt: Date.now() }); }, [id]);
  const handleUpdateChat = useCallback((msgs: ChatMessage[]) => { db.projects.update(id, { chatHistory: msgs, updatedAt: Date.now() }); }, [id]);

  const getContext = useCallback((): string => {
    if (!project) return "";
    const ap = project.pdfs.find((p) => p.id === project.activePdfId);
    if (!ap) return "";
    if (typeof document === "undefined") return "";
    const container = document.querySelector("[data-pdf-container]");
    if (!container) return "";
    const cp = ap.lastPage || 1;
    const texts: string[] = [];
    for (const pn of [cp - 1, cp, cp + 1].filter((p) => p >= 1)) {
      const pe = container.querySelector(`[data-page-number="${pn}"]`);
      if (pe) { const tl = pe.querySelector(".textLayer"); if (tl) texts.push(`[Page ${pn}]\n${tl.textContent || ""}`); }
    }
    return texts.join("\n\n") || `Active document: ${ap.name}`;
  }, [project]);

  const saveName = () => {
    if (nameValue.trim()) db.projects.update(id, { name: nameValue.trim(), updatedAt: Date.now() });
    setEditingName(false);
  };

  // Loading
  if (project === undefined) {
    return (
      <div className="flex flex-col h-screen">
        <div className="h-11 border-b flex items-center px-4 gap-3" style={{ borderColor: "var(--border)", background: "var(--panel-bg)" }}>
          <div className="skeleton w-6 h-6 rounded" /><div className="skeleton w-32 h-4 rounded" />
        </div>
        <div className="flex flex-1"><div className="skeleton" style={{ width: "30%" }} /><div className="flex-1" style={{ background: "var(--background)" }} /></div>
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p style={{ color: "var(--muted)" }}>Project not found</p>
        <button onClick={() => router.push("/")} className="text-sm px-4 py-2 rounded-lg" style={{ background: "var(--purple)", color: "#fff" }}>Back to Home</button>
      </div>
    );
  }

  // Safe defaults for fields that might be missing in older projects
  const pdfs = project.pdfs || [];
  const citations = project.citations || [];
  const chatHistory = project.chatHistory || [];
  const activePdfId = project.activePdfId || "";
  const activePdf = pdfs.find((p) => p.id === activePdfId) || null;

  const commands = [
    { id: "home", label: "Go to Home", category: "Navigation", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>, action: () => router.push("/") },
    { id: "sources", label: "Toggle Sources", category: "View", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>, action: () => setShowLibrary((s) => !s) },
    { id: "focus", label: focusMode ? "Exit Focus Mode" : "Focus Mode", category: "View", shortcut: "Ctrl+\\", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>, action: () => setFocusMode((f) => !f) },
    { id: "dark", label: "Toggle Dark Mode", category: "Appearance", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>, action: () => document.documentElement.classList.toggle("dark") },
    { id: "export-word", label: "Export to Word", category: "Export", shortcut: "Ctrl+S", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>, action: () => window.dispatchEvent(new CustomEvent("scribe:export-word")) },
    { id: "rename", label: "Rename Project", category: "Project", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>, action: () => setEditingName(true) },
  ];

  return (
    <div className={`flex flex-col h-screen ${focusMode ? "focus-mode" : ""}`}>
      <nav className="flex items-center justify-between px-4 h-11 shrink-0 border-b" style={{ borderColor: "var(--border)", background: "var(--panel-bg)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="flex items-center justify-center w-7 h-7 rounded-md transition-colors" style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div className="flex items-center justify-center w-6 h-6 rounded" style={{ background: "var(--purple)", color: "#fff" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
          </div>
          {editingName ? (
            <input autoFocus value={nameValue} onChange={(e) => setNameValue(e.target.value)} onBlur={saveName} onKeyDown={(e) => e.key === "Enter" && saveName()}
              className="text-sm font-semibold bg-transparent border-b outline-none px-1" style={{ color: "var(--foreground)", borderColor: "var(--purple)" }} />
          ) : (
            <span className="text-sm font-semibold tracking-tight cursor-pointer" style={{ color: "var(--foreground)" }} onClick={() => setEditingName(true)}>{project.name}</span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--hover)", color: "var(--muted)" }}>Auto-saved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setFocusMode(!focusMode)} className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
            style={{ color: focusMode ? "var(--purple)" : "var(--muted)", background: focusMode ? "var(--purple-bg)" : "transparent" }}
            onMouseEnter={(e) => { if (!focusMode) e.currentTarget.style.background = "var(--hover)"; }} onMouseLeave={(e) => { if (!focusMode) e.currentTarget.style.background = focusMode ? "var(--purple-bg)" : "transparent"; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
          </button>
          {!focusMode && (
            <button onClick={() => setShowLibrary(!showLibrary)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
              style={{ color: showLibrary ? "var(--purple)" : "var(--muted)", background: showLibrary ? "var(--purple-bg)" : "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = showLibrary ? "var(--purple-bg)" : "var(--hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = showLibrary ? "var(--purple-bg)" : "transparent")}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              Sources
            </button>
          )}
          <ThemeToggle />
        </div>
      </nav>

      <div ref={containerRef} className="flex flex-1 min-h-0" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        {!focusMode && (
          <>
            <div className={`flex flex-col shrink-0 ${draggingFile ? "drop-zone-active" : ""}`}
              style={{ width: `${panelWidth}%`, borderRight: "1px solid var(--border)", background: "var(--surface)", transition: isResizing ? "none" : "width 0.2s ease" }}>
              {showLibrary ? (
                <PdfLibrary pdfs={pdfs} activePdfId={activePdfId} onSelect={handleSelectPdf} onAdd={handleAddPdf} onRemove={handleRemovePdfs} onUpdateMeta={handleUpdatePdfMeta} />
              ) : (
                <>
                  <button onClick={() => setShowLibrary(true)} className="flex items-center gap-1.5 px-3 h-9 shrink-0 border-b text-[11px] font-medium transition-colors"
                    style={{ borderColor: "var(--border)", color: "var(--purple)", background: "var(--toolbar-bg)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--purple-bg)")} onMouseLeave={(e) => (e.currentTarget.style.background = "var(--toolbar-bg)")}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                    Back to Sources
                    {activePdf && <span className="ml-auto truncate max-w-[100px] text-[10px]" style={{ color: "var(--muted)" }}>{activePdf.name}</span>}
                  </button>
                  <div className="flex-1 overflow-hidden">
                    <PdfViewer onCite={handleCite} pdfData={activePdf?.data || null} pdfName={activePdf?.name || ""}
                      onPageChange={(page) => { if (activePdf) handlePageChange(activePdf.id, page); }} initialPage={activePdf?.lastPage || 1} />
                  </div>
                </>
              )}
            </div>
            <div className={`resize-handle ${isResizing ? "active" : ""}`} onMouseDown={() => setIsResizing(true)} />
          </>
        )}

        <div className="flex flex-col flex-1 min-w-0" style={{ background: "var(--panel-bg)" }}>
          <Editor projectId={id} initialContent={project.content || ""} initialCitations={citations}
            onContentChange={handleContentChange}
            onCitationsChange={(cits) => { db.projects.update(id, { citations: cits, updatedAt: Date.now() }); }}
            projectName={project.name} chatHistory={chatHistory} onUpdateChat={handleUpdateChat} getContext={getContext} />
        </div>
      </div>

      <CommandPalette commands={commands} />
      <KeyboardShortcuts />
    </div>
  );
}
