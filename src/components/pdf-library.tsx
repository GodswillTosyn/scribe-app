"use client";

import { useState, useRef } from "react";
import type { PdfFile } from "@/lib/db";

interface PdfLibraryProps {
  pdfs: PdfFile[];
  activePdfId: string;
  onSelect: (id: string) => void;
  onAdd: (file: File) => void;
  onRemove: (ids: string[]) => void;
  onUpdateMeta: (id: string, authors: string, year: string) => void;
}

export default function PdfLibrary({
  pdfs,
  activePdfId,
  onSelect,
  onAdd,
  onRemove,
  onUpdateMeta,
}: PdfLibraryProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAuthors, setEditAuthors] = useState("");
  const [editYear, setEditYear] = useState("");
  const [pendingPdf, setPendingPdf] = useState<{ file: File; name: string } | null>(null);
  const [pendingAuthors, setPendingAuthors] = useState("");
  const [pendingYear, setPendingYear] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteSelected = () => {
    onRemove(Array.from(selected));
    setSelected(new Set());
  };

  const startEdit = (pdf: PdfFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(pdf.id);
    setEditAuthors(pdf.authors);
    setEditYear(pdf.year);
  };

  const saveEdit = () => {
    if (editingId) {
      onUpdateMeta(editingId, editAuthors, editYear);
      setEditingId(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type === "application/pdf") {
      setPendingPdf({ file: f, name: f.name });
      setPendingAuthors("");
      setPendingYear("");
    }
    e.target.value = "";
  };

  const confirmAdd = () => {
    if (!pendingPdf) return;
    // We'll pass metadata via a custom event since onAdd only takes File
    // Instead, extend the flow: add file, then update meta
    onAdd(pendingPdf.file);
    // Store pending meta to apply after add
    window.__scribePendingMeta = { authors: pendingAuthors, year: pendingYear };
    setPendingPdf(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 h-10 shrink-0 border-b"
        style={{ borderColor: "var(--border)", background: "var(--toolbar-bg)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--purple)" }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
          Sources
        </span>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: "var(--purple-bg)", color: "var(--purple)", border: "1px solid var(--purple-border)" }}
        >
          {pdfs.length}
        </span>
        <div className="flex-1" />
        {selected.size > 0 && (
          <button
            onClick={deleteSelected}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors"
            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            Delete {selected.size}
          </button>
        )}
        <label
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold cursor-pointer transition-colors"
          style={{ background: "var(--purple)", color: "#fff" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--purple-soft)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--purple)")}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
        </label>
        <div className="relative group">
          <button
            disabled
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium cursor-not-allowed opacity-50"
            style={{ background: "var(--hover)", color: "var(--muted)" }}
          >
            DOCX
          </button>
          <div className="absolute bottom-full right-0 mb-1 px-2 py-1 rounded text-[9px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{ background: "var(--foreground)", color: "var(--background)" }}>
            Coming soon
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3">
        {pdfs.length === 0 && !pendingPdf ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--purple-bg), rgba(109,40,217,0.12))" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--purple)" }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <p className="text-xs text-center" style={{ color: "var(--muted)" }}>Add your first source PDF</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {pdfs.map((pdf) => {
              const isActive = pdf.id === activePdfId;
              const isSelected = selected.has(pdf.id);
              const isEditing = editingId === pdf.id;

              return (
                <div
                  key={pdf.id}
                  onClick={() => onSelect(pdf.id)}
                  className="group relative rounded-2xl overflow-hidden cursor-pointer"
                  style={{
                    background: "var(--panel-bg)",
                    border: `1.5px solid ${isActive ? "var(--purple-border)" : isSelected ? "var(--purple)" : "var(--border)"}`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    transition: "all 0.25s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(109,40,217,0.1), 0 2px 8px rgba(0,0,0,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                  }}
                >
                  {/* Image area with PDF icon */}
                  <div
                    className="relative h-20 flex items-center justify-center"
                    style={{ background: isActive
                      ? "linear-gradient(135deg, rgba(109,40,217,0.1) 0%, rgba(109,40,217,0.05) 100%)"
                      : "linear-gradient(135deg, var(--surface) 0%, var(--hover) 100%)"
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: isActive ? "var(--purple)" : "rgba(0,0,0,0.04)" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ color: isActive ? "#fff" : "var(--muted)" }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </div>

                    {/* Checkbox */}
                    <div
                      onClick={(e) => toggleSelect(pdf.id, e)}
                      className="absolute top-2 left-2 w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all"
                      style={{ borderColor: isSelected ? "var(--purple)" : "rgba(0,0,0,0.15)", background: isSelected ? "var(--purple)" : "rgba(255,255,255,0.7)", backdropFilter: "blur(4px)" }}
                    >
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      )}
                    </div>

                    {/* Action buttons */}
                    {!isEditing && (
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={(e) => startEdit(pdf, e)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(4px)", color: "var(--muted)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.95)")} onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.8)")} title="Edit">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onRemove([pdf.id]); }} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ background: "rgba(239,68,68,0.1)", backdropFilter: "blur(4px)", color: "#ef4444" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.2)")} onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")} title="Remove">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </div>
                    )}

                    {/* Active badge */}
                    {isActive && (
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-semibold"
                        style={{ background: "var(--purple)", color: "#fff" }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        Viewing
                      </div>
                    )}
                  </div>

                  {/* Content area */}
                  <div className="p-3">
                    {isEditing ? (
                      <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <input autoFocus value={editAuthors} onChange={(e) => setEditAuthors(e.target.value)} placeholder="Author(s)"
                          className="w-full px-2.5 py-1.5 rounded-lg text-[11px] outline-none border" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
                          onKeyDown={(e) => e.key === "Enter" && saveEdit()} />
                        <div className="flex gap-1.5">
                          <input value={editYear} onChange={(e) => setEditYear(e.target.value)} placeholder="Year"
                            className="flex-1 px-2.5 py-1.5 rounded-lg text-[11px] outline-none border" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
                            onKeyDown={(e) => e.key === "Enter" && saveEdit()} />
                          <button onClick={saveEdit} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold" style={{ background: "var(--purple)", color: "#fff" }}>Save</button>
                          <button onClick={() => setEditingId(null)} className="px-2 py-1.5 rounded-lg text-[10px]" style={{ background: "var(--hover)", color: "var(--muted)" }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-[12px] font-semibold truncate" style={{ color: "var(--foreground)" }}>{pdf.name}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
                          {pdf.authors ? (
                            <span>{pdf.authors}{pdf.year ? ` (${pdf.year})` : ""}</span>
                          ) : (
                            <span style={{ opacity: 0.5, fontStyle: "italic" }}>No author set</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add PDF modal — author/year prompt */}
      {pendingPdf && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div
            className="w-[340px] rounded-2xl p-5 flex flex-col gap-4"
            style={{
              background: "var(--panel-bg)",
              border: "1px solid var(--border)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--purple-bg)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--purple)" }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Add Source</div>
                <div className="text-[11px] truncate max-w-[220px]" style={{ color: "var(--muted)" }}>{pendingPdf.name}</div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Author(s)
              </label>
              <input
                autoFocus
                value={pendingAuthors}
                onChange={(e) => setPendingAuthors(e.target.value)}
                placeholder="e.g. Smith, Jones & Lee"
                className="w-full px-3 py-2 rounded-lg text-xs outline-none border"
                style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
                onKeyDown={(e) => e.key === "Enter" && confirmAdd()}
              />
              <label className="text-[10px] font-semibold uppercase tracking-wider mt-1" style={{ color: "var(--muted)" }}>
                Year
              </label>
              <input
                value={pendingYear}
                onChange={(e) => setPendingYear(e.target.value)}
                placeholder="e.g. 2023"
                className="w-full px-3 py-2 rounded-lg text-xs outline-none border"
                style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
                onKeyDown={(e) => e.key === "Enter" && confirmAdd()}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPendingPdf(null)}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{ background: "var(--hover)", color: "var(--muted)" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmAdd}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: "var(--purple)", color: "#fff" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--purple-soft)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--purple)")}
              >
                Add Source
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Extend window for pending metadata
declare global {
  interface Window {
    __scribePendingMeta?: { authors: string; year: string };
  }
}
