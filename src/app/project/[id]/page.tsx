"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { db, type Project, type CitationRecord, type ChatMessage } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import type { CitationPayload } from "@/components/pdf-viewer";
import { pdfjs } from "react-pdf";

const PdfViewer = dynamic(() => import("@/components/pdf-viewer"), { ssr: false });
const PdfLibrary = dynamic(() => import("@/components/pdf-library"), { ssr: false });
const Editor = dynamic(() => import("@/components/editor"), { ssr: false });
const ThemeToggle = dynamic(() => import("@/components/theme-toggle"), { ssr: false });

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const project = useLiveQuery(() => db.projects.get(id), [id]);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [showLibrary, setShowLibrary] = useState(true);

  useEffect(() => {
    if (project) setNameValue(project.name);
  }, [project?.name]);

  // Auto-fill author/year from the active PDF into citations
  const handleCite = useCallback(
    (payload: CitationPayload) => {
      if (!project) return;
      const activePdf = project.pdfs.find((p) => p.id === project.activePdfId);

      // Format authors per APA 7th
      let formattedAuthors = payload.authors;
      if (activePdf?.authors) {
        const authorList = activePdf.authors.split(/[,;&]+/).map((a) => a.trim()).filter(Boolean);
        if (authorList.length === 1) formattedAuthors = authorList[0];
        else if (authorList.length === 2) formattedAuthors = `${authorList[0]} & ${authorList[1]}`;
        else if (authorList.length > 2) formattedAuthors = `${authorList[0]} et al.`;
      }

      const enriched: CitationPayload = {
        ...payload,
        authors: formattedAuthors || payload.filename.replace(/\.pdf$/i, ""),
        year: activePdf?.year || "n.d.",
      };

      window.dispatchEvent(new CustomEvent("scribe:cite", { detail: enriched }));

      const rec: CitationRecord = {
        id: enriched.id,
        text: enriched.text,
        filename: enriched.filename,
        authors: enriched.authors,
        year: enriched.year,
        page: enriched.page,
        posY: enriched.posY,
      };
      db.projects.update(id, {
        citations: [...project.citations, rec],
        updatedAt: Date.now(),
      });
    },
    [project, id]
  );

  const handleAddPdf = useCallback(
    async (file: File) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const pdfId = crypto.randomUUID();
        const meta = window.__scribePendingMeta || { authors: "", year: "" };
        delete window.__scribePendingMeta;

        const newPdf = {
          id: pdfId,
          name: file.name,
          data: base64,
          authors: meta.authors,
          year: meta.year,
          lastPage: 1,
        };
        if (project) {
          await db.projects.update(id, {
            pdfs: [...project.pdfs, newPdf],
            activePdfId: pdfId,
            updatedAt: Date.now(),
          });
        }
      };
      reader.readAsDataURL(file);
    },
    [project, id]
  );

  const handleSelectPdf = useCallback(
    (pdfId: string) => {
      db.projects.update(id, { activePdfId: pdfId, updatedAt: Date.now() });
      setShowLibrary(false);
    },
    [id]
  );

  const handleRemovePdfs = useCallback(
    (pdfIds: string[]) => {
      if (!project) return;
      const remaining = project.pdfs.filter((p) => !pdfIds.includes(p.id));
      const newActive = pdfIds.includes(project.activePdfId)
        ? remaining[remaining.length - 1]?.id || ""
        : project.activePdfId;
      db.projects.update(id, { pdfs: remaining, activePdfId: newActive, updatedAt: Date.now() });
    },
    [project, id]
  );

  const handleUpdatePdfMeta = useCallback(
    (pdfId: string, authors: string, year: string) => {
      if (!project) return;
      const pdfs = project.pdfs.map((p) =>
        p.id === pdfId ? { ...p, authors, year } : p
      );
      db.projects.update(id, { pdfs, updatedAt: Date.now() });
    },
    [project, id]
  );

  const handlePageChange = useCallback(
    (pdfId: string, page: number) => {
      if (!project) return;
      const pdfs = project.pdfs.map((p) =>
        p.id === pdfId ? { ...p, lastPage: page } : p
      );
      db.projects.update(id, { pdfs, updatedAt: Date.now() });
    },
    [project, id]
  );

  useEffect(() => {
    const handleGoto = (e: Event) => {
      const payload = (e as CustomEvent<CitationPayload>).detail;
      if (!payload || !project) return;
      const matchingPdf = project.pdfs.find((p) => p.name === payload.filename);
      if (matchingPdf) {
        if (matchingPdf.id !== project.activePdfId) {
          db.projects.update(id, { activePdfId: matchingPdf.id, updatedAt: Date.now() });
        }
        setShowLibrary(false);
      }
    };
    window.addEventListener("scribe:goto-citation", handleGoto);
    return () => window.removeEventListener("scribe:goto-citation", handleGoto);
  }, [project, id]);

  const handleContentChange = useCallback(
    (html: string) => {
      db.projects.update(id, { content: html, updatedAt: Date.now() });
    },
    [id]
  );

  const handleUpdateChat = useCallback(
    (msgs: ChatMessage[]) => {
      db.projects.update(id, { chatHistory: msgs, updatedAt: Date.now() });
    },
    [id]
  );

  // Extract text from current PDF page + surrounding pages for AI context
  const getContext = useCallback((): string => {
    if (!project) return "";
    const activePdf = project.pdfs.find((p) => p.id === project.activePdfId);
    if (!activePdf) return "";
    // We'll extract text from the text layer elements currently in the DOM
    const container = document.querySelector("[data-pdf-container]");
    if (!container) return "";
    const currentPage = activePdf.lastPage || 1;
    const pages = [currentPage - 1, currentPage, currentPage + 1].filter((p) => p >= 1);
    const texts: string[] = [];
    for (const pageNum of pages) {
      const pageEl = container.querySelector(`[data-page-number="${pageNum}"]`);
      if (pageEl) {
        const textLayer = pageEl.querySelector(".textLayer");
        if (textLayer) {
          texts.push(`[Page ${pageNum}]\n${textLayer.textContent || ""}`);
        }
      }
    }
    return texts.join("\n\n") || `No text could be extracted from the PDF. The active document is: ${activePdf.name}`;
  }, [project]);

  const saveName = () => {
    if (nameValue.trim()) db.projects.update(id, { name: nameValue.trim(), updatedAt: Date.now() });
    setEditingName(false);
  };

  if (project === undefined) {
    return <div className="flex items-center justify-center h-screen" style={{ color: "var(--muted)" }}>Loading...</div>;
  }
  if (project === null) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p style={{ color: "var(--muted)" }}>Project not found</p>
        <button onClick={() => router.push("/")} className="text-sm px-4 py-2 rounded-lg" style={{ background: "var(--purple)", color: "#fff" }}>Back to Home</button>
      </div>
    );
  }

  const activePdf = project.pdfs.find((p) => p.id === project.activePdfId) || null;

  return (
    <div className="flex flex-col h-screen">
      {/* Top nav */}
      <nav className="flex items-center justify-between px-4 h-11 shrink-0 border-b" style={{ borderColor: "var(--border)", background: "var(--panel-bg)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="flex items-center justify-center w-7 h-7 rounded-md transition-colors" style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")} title="Back to projects">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div className="flex items-center justify-center w-6 h-6 rounded" style={{ background: "var(--purple)", color: "#fff" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
          </div>
          {editingName ? (
            <input autoFocus value={nameValue} onChange={(e) => setNameValue(e.target.value)} onBlur={saveName} onKeyDown={(e) => e.key === "Enter" && saveName()}
              className="text-sm font-semibold bg-transparent border-b outline-none px-1" style={{ color: "var(--foreground)", borderColor: "var(--purple)" }} />
          ) : (
            <span className="text-sm font-semibold tracking-tight cursor-pointer" style={{ color: "var(--foreground)" }} onClick={() => setEditingName(true)} title="Click to rename">
              {project.name}
            </span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--hover)", color: "var(--muted)" }}>Auto-saved</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle between library and viewer */}
          <button
            onClick={() => setShowLibrary(!showLibrary)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
            style={{ color: showLibrary ? "var(--purple)" : "var(--muted)", background: showLibrary ? "var(--purple-bg)" : "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = showLibrary ? "var(--purple-bg)" : "var(--hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = showLibrary ? "var(--purple-bg)" : "transparent")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
            Sources
          </button>
          <ThemeToggle />
        </div>
      </nav>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel — Library or Viewer */}
        <div className="flex flex-col border-r shrink-0" style={{ width: "30%", borderColor: "var(--border)", background: "var(--surface)" }}>
          {showLibrary ? (
            <PdfLibrary
              pdfs={project.pdfs}
              activePdfId={project.activePdfId}
              onSelect={handleSelectPdf}
              onAdd={handleAddPdf}
              onRemove={handleRemovePdfs}
              onUpdateMeta={handleUpdatePdfMeta}
            />
          ) : (
            <>
              {/* Back to library button */}
              <button
                onClick={() => setShowLibrary(true)}
                className="flex items-center gap-1.5 px-3 h-9 shrink-0 border-b text-[11px] font-medium transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--purple)", background: "var(--toolbar-bg)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--purple-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--toolbar-bg)")}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back to Sources
                {activePdf && (
                  <span className="ml-auto truncate max-w-[120px] text-[10px]" style={{ color: "var(--muted)" }}>
                    {activePdf.name}
                  </span>
                )}
              </button>
              <div className="flex-1 overflow-hidden">
                <PdfViewer
                  onCite={handleCite}
                  pdfData={activePdf?.data || null}
                  pdfName={activePdf?.name || ""}
                  onPageChange={(page) => {
                    if (activePdf) handlePageChange(activePdf.id, page);
                  }}
                  initialPage={activePdf?.lastPage || 1}
                />
              </div>
            </>
          )}
        </div>

        {/* Editor */}
        <div className="flex flex-col flex-1 min-w-0" style={{ background: "var(--panel-bg)" }}>
          <Editor
            projectId={id}
            initialContent={project.content}
            initialCitations={project.citations}
            onContentChange={handleContentChange}
            onCitationsChange={(cits) => {
              db.projects.update(id, { citations: cits, updatedAt: Date.now() });
            }}
            projectName={project.name}
            chatHistory={project.chatHistory || []}
            onUpdateChat={handleUpdateChat}
            getContext={getContext}
          />
        </div>
      </div>
    </div>
  );
}
