"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent, Editor as TiptapEditor } from "@tiptap/react";
import { Mark } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TableKit } from "@tiptap/extension-table";
import { CitationNode } from "./citation-node";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import Dropcursor from "@tiptap/extension-dropcursor";
import { motion, AnimatePresence } from "framer-motion";
import GrammarCheck from "./grammar-check";
import type { CitationPayload } from "./pdf-viewer";
import type { ChatMessage, CitationRecord, VersionSnapshot } from "@/lib/db";
import { db } from "@/lib/db";
import { exportToWord, exportToPdf } from "@/lib/export";
import AiChat from "./ai-chat";
import ArxivSearch from "./arxiv-search";
import VersionHistory from "./version-history";
import toast from "react-hot-toast";

/* ─── Tab types ─── */
interface EditorTab {
  id: string;
  label: string;
  content: string;
}

/* ─── Small reusable pieces ─── */
function Btn({ onClick, isActive, children, title }: { onClick: () => void; isActive?: boolean; children: React.ReactNode; title: string }) {
  return (
    <button onClick={onClick} title={title} className="flex items-center justify-center h-7 min-w-[28px] px-1.5 rounded transition-colors text-[13px]"
      style={{ background: isActive ? "var(--active)" : "transparent", color: isActive ? "var(--foreground)" : "var(--muted)" }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--hover)"; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
      {children}
    </button>
  );
}
function Sep() { return <div className="w-px h-5 mx-1 shrink-0" style={{ background: "var(--border)" }} />; }
function Grp({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5 px-0.5">{children}</div>;
}

/* ─── Table grid picker ─── */
function TablePicker({ onInsert }: { onInsert: (rows: number, cols: number) => void }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState({ r: 0, c: 0 });
  const MAX = 8;

  return (
    <div className="relative">
      <Btn onClick={() => setOpen(!open)} isActive={open} title="Insert Table">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>
      </Btn>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 p-2 rounded-xl z-50"
          style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
          onMouseLeave={() => setHover({ r: 0, c: 0 })}
        >
          <div className="text-[10px] font-medium mb-1.5 text-center" style={{ color: "var(--muted)" }}>
            {hover.r > 0 ? `${hover.r} × ${hover.c}` : "Select size"}
          </div>
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${MAX}, 1fr)` }}>
            {Array.from({ length: MAX * MAX }, (_, i) => {
              const r = Math.floor(i / MAX) + 1;
              const c = (i % MAX) + 1;
              const active = r <= hover.r && c <= hover.c;
              return (
                <div
                  key={i}
                  className="w-[14px] h-[14px] rounded-[2px] cursor-pointer transition-colors"
                  style={{ background: active ? "var(--purple)" : "var(--hover)", opacity: active ? 1 : 0.5 }}
                  onMouseEnter={() => setHover({ r, c })}
                  onClick={() => { onInsert(r, c); setOpen(false); setHover({ r: 0, c: 0 }); }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const FONTS = ["Space Grotesk", "Inter", "Arial", "Georgia", "Times New Roman", "Courier New", "Comic Sans MS"];
const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];

/* ─── Comment Mark Extension ─── */
const CommentMark = Mark.create({
  name: "comment",
  addAttributes() {
    return {
      comment: { default: "" },
      id: { default: "" },
    };
  },
  parseHTML() { return [{ tag: "span[data-comment]" }]; },
  renderHTML({ HTMLAttributes }) {
    return ["span", { ...HTMLAttributes, "data-comment": HTMLAttributes.comment, style: "background: rgba(250,204,21,0.3); border-bottom: 2px solid rgba(250,204,21,0.6); cursor: help;", title: HTMLAttributes.comment }, 0];
  },
});

/* ─── Table Toolbar (contextual, shown when cursor is in table) ─── */
function TableToolbar({ editor }: { editor: TiptapEditor }) {
  if (!editor.isActive("table")) return null;
  return (
    <div className="flex items-center gap-0.5 px-2 py-1 border-b shrink-0 flex-wrap" style={{ borderColor: "var(--border)", background: "var(--toolbar-bg)" }}>
      <span className="text-[10px] font-medium mr-1" style={{ color: "var(--muted)" }}>Table:</span>
      <Btn onClick={() => editor.chain().focus().addRowBefore().run()} title="Add Row Above"><span className="text-[10px]">+Row&uarr;</span></Btn>
      <Btn onClick={() => editor.chain().focus().addRowAfter().run()} title="Add Row Below"><span className="text-[10px]">+Row&darr;</span></Btn>
      <Btn onClick={() => editor.chain().focus().addColumnBefore().run()} title="Add Column Left"><span className="text-[10px]">+Col&larr;</span></Btn>
      <Btn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add Column Right"><span className="text-[10px]">+Col&rarr;</span></Btn>
      <Sep />
      <Btn onClick={() => editor.chain().focus().deleteRow().run()} title="Delete Row"><span className="text-[10px]" style={{ color: "#ef4444" }}>-Row</span></Btn>
      <Btn onClick={() => editor.chain().focus().deleteColumn().run()} title="Delete Column"><span className="text-[10px]" style={{ color: "#ef4444" }}>-Col</span></Btn>
      <Btn onClick={() => editor.chain().focus().deleteTable().run()} title="Delete Table"><span className="text-[10px]" style={{ color: "#ef4444" }}>Del Table</span></Btn>
      <Sep />
      <Btn onClick={() => editor.chain().focus().mergeCells().run()} title="Merge Cells"><span className="text-[10px]">Merge</span></Btn>
      <Btn onClick={() => editor.chain().focus().splitCell().run()} title="Split Cell"><span className="text-[10px]">Split</span></Btn>
    </div>
  );
}

/* ─── Toolbar ─── */
function Toolbar({ editor, onExportWord, onExportPdf, onGenerateRefs, onShowHistory, onToggleFindReplace, onPrint, onAddComment }: { editor: TiptapEditor; onExportWord: () => void; onExportPdf: () => void; onGenerateRefs: () => void; onShowHistory: () => void; onToggleFindReplace: () => void; onPrint: () => void; onAddComment: () => void }) {
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showSpecialChars, setShowSpecialChars] = useState(false);
  const [showGrammar, setShowGrammar] = useState(false);

  const COLOR_PRESETS = [
    { label: "Black", value: "#000000" },
    { label: "Red", value: "#dc2626" },
    { label: "Blue", value: "#2563eb" },
    { label: "Green", value: "#16a34a" },
    { label: "Orange", value: "#ea580c" },
    { label: "Purple", value: "#7c3aed" },
    { label: "Gray", value: "#6b7280" },
    { label: "Brown", value: "#92400e" },
  ];

  const SPECIAL_CHARS = ["—", "–", "…", "©", "®", "™", "§", "¶", "•", "°", "±", "×", "÷", "≈", "≠", "≤", "≥", "←", "→", "↑", "↓", "α", "β", "γ", "δ", "π", "σ"];

  const currentFont = (editor.getAttributes("textStyle").fontFamily as string) || "Space Grotesk";
  const currentSize = (editor.getAttributes("textStyle").fontSize as string) || "15px";

  return (
    <div className="editor-toolbar flex items-center gap-0.5 px-2 py-1.5 border-b shrink-0 flex-wrap" style={{ borderColor: "var(--border)", background: "var(--toolbar-bg)" }}>
      {/* Font family */}
      <Grp label="Font">
        <div className="relative">
          <button onClick={() => { setShowFontMenu(!showFontMenu); setShowSizeMenu(false); setShowExportMenu(false); }}
            className="flex items-center gap-1 h-7 px-2 rounded text-[11px] transition-colors"
            style={{ color: "var(--foreground)", background: showFontMenu ? "var(--hover)" : "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => { if (!showFontMenu) e.currentTarget.style.background = "transparent"; }}>
            <span className="truncate max-w-[80px]">{currentFont}</span>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {showFontMenu && (
            <div className="absolute top-full left-0 mt-1 py-1 rounded-lg shadow-lg border z-50 w-44" style={{ background: "var(--panel-bg)", borderColor: "var(--border)" }}>
              {FONTS.map((f) => (
                <button key={f} onClick={() => { editor.chain().focus().setFontFamily(f).run(); setShowFontMenu(false); }}
                  className="block w-full text-left px-3 py-1.5 text-xs transition-colors" style={{ fontFamily: f, color: "var(--foreground)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Font size */}
        <div className="relative">
          <button onClick={() => { setShowSizeMenu(!showSizeMenu); setShowFontMenu(false); setShowExportMenu(false); }}
            className="flex items-center gap-1 h-7 px-2 rounded text-[11px] transition-colors"
            style={{ color: "var(--foreground)", background: showSizeMenu ? "var(--hover)" : "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => { if (!showSizeMenu) e.currentTarget.style.background = "transparent"; }}>
            {parseInt(currentSize) || 15}
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {showSizeMenu && (
            <div className="absolute top-full left-0 mt-1 py-1 rounded-lg shadow-lg border z-50 w-20" style={{ background: "var(--panel-bg)", borderColor: "var(--border)" }}>
              {FONT_SIZES.map((s) => (
                <button key={s} onClick={() => { editor.chain().focus().setFontSize(s).run(); setShowSizeMenu(false); }}
                  className="block w-full text-left px-3 py-1.5 text-xs transition-colors" style={{ color: "var(--foreground)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  {parseInt(s)}
                </button>
              ))}
            </div>
          )}
        </div>
      </Grp>
      <Sep />
      {/* Styles */}
      <Grp label="Styles">
        <Btn onClick={() => editor.chain().focus().setParagraph().run()} isActive={editor.isActive("paragraph") && !editor.isActive("heading")} title="Normal">P</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive("heading", { level: 1 })} title="H1">H1</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive("heading", { level: 2 })} title="H2">H2</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive("heading", { level: 3 })} title="H3">H3</Btn>
      </Grp>
      <Sep />
      {/* Format */}
      <Grp label="Format">
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} title="Bold"><strong>B</strong></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} title="Italic"><em className="font-serif">I</em></Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive("underline")} title="Underline"><u>U</u></Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")} title="Strike"><s>S</s></Btn>
        <Btn onClick={() => editor.chain().focus().toggleSubscript().run()} isActive={editor.isActive("subscript")} title="Subscript"><span className="text-[10px]">X<sub>2</sub></span></Btn>
        <Btn onClick={() => editor.chain().focus().toggleSuperscript().run()} isActive={editor.isActive("superscript")} title="Superscript"><span className="text-[10px]">X<sup>2</sup></span></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={editor.isActive("highlight")} title="Highlight">
          <span className="text-[11px] px-0.5" style={{ background: "rgba(250,204,21,0.4)", borderRadius: "2px" }}>A</span>
        </Btn>
      </Grp>
      <Sep />
      {/* Link */}
      <Grp label="Link">
        <Btn onClick={() => {
          if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run();
          } else {
            const url = window.prompt("Enter URL:");
            if (url) {
              editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
            }
          }
        }} isActive={editor.isActive("link")} title="Link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
        </Btn>
      </Grp>
      <Sep />
      {/* Text Color */}
      <Grp label="Color">
        <div className="relative">
          <Btn onClick={() => { setShowColorMenu(!showColorMenu); setShowFontMenu(false); setShowSizeMenu(false); setShowExportMenu(false); setShowSpecialChars(false); }} title="Text Color">
            <span className="text-[12px] font-bold" style={{ borderBottom: `3px solid ${(editor.getAttributes("textStyle").color as string) || "var(--foreground)"}` }}>A</span>
          </Btn>
          {showColorMenu && (
            <div className="absolute top-full left-0 mt-1 p-2 rounded-lg shadow-lg border z-50" style={{ background: "var(--panel-bg)", borderColor: "var(--border)", width: "148px" }}>
              <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button key={c.value} onClick={() => { editor.chain().focus().setColor(c.value).run(); setShowColorMenu(false); }}
                    className="w-7 h-7 rounded-md border transition-transform hover:scale-110 cursor-pointer" title={c.label}
                    style={{ background: c.value, borderColor: "var(--border)" }} />
                ))}
              </div>
              <button onClick={() => { editor.chain().focus().unsetColor().run(); setShowColorMenu(false); }}
                className="w-full text-[10px] py-1 rounded transition-colors text-center" style={{ color: "var(--muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                Reset
              </button>
            </div>
          )}
        </div>
      </Grp>
      <Sep />
      {/* Align */}
      <Grp label="Align">
        <Btn onClick={() => editor.chain().focus().setTextAlign("left").run()} isActive={editor.isActive({ textAlign: "left" })} title="Left">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" /></svg>
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign("center").run()} isActive={editor.isActive({ textAlign: "center" })} title="Center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></svg>
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign("right").run()} isActive={editor.isActive({ textAlign: "right" })} title="Right">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" /></svg>
        </Btn>
      </Grp>
      <Sep />
      {/* Indent / Outdent */}
      <Grp label="Indent">
        <Btn onClick={() => editor.chain().focus().sinkListItem("listItem").run()} title="Indent">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /><line x1="3" y1="6" x2="3" y2="18" /></svg>
        </Btn>
        <Btn onClick={() => editor.chain().focus().liftListItem("listItem").run()} title="Outdent">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 6 9 12 15 18" /><line x1="21" y1="6" x2="21" y2="18" /></svg>
        </Btn>
      </Grp>
      <Sep />
      {/* Lists & Insert */}
      <Grp label="Insert">
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")} title="Bullet List">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="4" cy="6" r="1" fill="currentColor" /><circle cx="4" cy="12" r="1" fill="currentColor" /><circle cx="4" cy="18" r="1" fill="currentColor" /></svg>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")} title="Ordered List">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><text x="2" y="8" fontSize="8" fill="currentColor" stroke="none">1</text><text x="2" y="14" fontSize="8" fill="currentColor" stroke="none">2</text><text x="2" y="20" fontSize="8" fill="currentColor" stroke="none">3</text></svg>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive("taskList")} title="Task List">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="6" height="6" rx="1" /><polyline points="5 7.5 6 8.5 8.5 6" /><line x1="12" y1="8" x2="21" y2="8" /><rect x="3" y="13" width="6" height="6" rx="1" /><line x1="12" y1="16" x2="21" y2="16" /></svg>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive("blockquote")} title="Quote">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" /></svg>
        </Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="12" x2="22" y2="12" /></svg>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive("codeBlock")} title="Code Block">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
        </Btn>
        <TablePicker onInsert={(rows, cols) => editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()} />
        {/* Special Characters */}
        <div className="relative">
          <Btn onClick={() => { setShowSpecialChars(!showSpecialChars); setShowFontMenu(false); setShowSizeMenu(false); setShowExportMenu(false); setShowColorMenu(false); }} isActive={showSpecialChars} title="Special Characters">
            <span className="text-[12px] font-bold">&Omega;</span>
          </Btn>
          {showSpecialChars && (
            <div className="absolute top-full left-0 mt-1 p-2 rounded-lg shadow-lg border z-50" style={{ background: "var(--panel-bg)", borderColor: "var(--border)", width: "200px" }}>
              <div className="grid grid-cols-9 gap-0.5">
                {SPECIAL_CHARS.map((ch) => (
                  <button key={ch} onClick={() => { editor.chain().focus().insertContent(ch).run(); setShowSpecialChars(false); }}
                    className="w-5 h-5 flex items-center justify-center rounded text-[12px] transition-colors cursor-pointer"
                    style={{ color: "var(--foreground)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    {ch}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Grp>
      <Sep />
      {/* Find & Replace */}
      <Grp label="Find">
        <Btn onClick={onToggleFindReplace} title="Find & Replace">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </Btn>
      </Grp>
      <Sep />
      {/* Undo/Redo */}
      <Grp label="History">
        <Btn onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
        </Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" /></svg>
        </Btn>
        <Btn onClick={onShowHistory} title="Version History">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
        </Btn>
      </Grp>
      <Sep />
      {/* References */}
      <Grp label="Refs">
        <Btn onClick={onGenerateRefs} title="Generate Reference List">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          </svg>
        </Btn>
      </Grp>
      <Sep />
      {/* Comment */}
      <Grp label="Comment">
        <Btn onClick={onAddComment} isActive={editor.isActive("comment")} title="Add Comment">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        </Btn>
      </Grp>
      <Sep />
      {/* Grammar Check */}
      <Grp label="Grammar">
        <div className="relative">
          <Btn onClick={() => { setShowGrammar(!showGrammar); setShowFontMenu(false); setShowSizeMenu(false); setShowExportMenu(false); setShowColorMenu(false); setShowSpecialChars(false); }} isActive={showGrammar} title="Grammar Check">
            <span className="text-[11px] font-bold">ABC<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", marginLeft: "1px", verticalAlign: "super" }}><polyline points="20 6 9 17 4 12" /></svg></span>
          </Btn>
          {showGrammar && <GrammarCheck editor={editor} onClose={() => setShowGrammar(false)} />}
        </div>
      </Grp>
      <Sep />
      {/* Export */}
      <Grp label="Export">
        <div className="relative">
          <Btn onClick={() => { setShowExportMenu(!showExportMenu); setShowFontMenu(false); setShowSizeMenu(false); }} title="Download">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </Btn>
          {showExportMenu && (
            <div className="absolute top-full right-0 mt-1 py-1 rounded-lg shadow-lg border z-50 w-36" style={{ background: "var(--panel-bg)", borderColor: "var(--border)" }}>
              <button onClick={() => { onExportWord(); setShowExportMenu(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors" style={{ color: "var(--foreground)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <span style={{ color: "var(--purple)" }}>W</span> Word (.docx)
              </button>
              <button onClick={() => { onExportPdf(); setShowExportMenu(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors" style={{ color: "var(--foreground)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <span style={{ color: "#ef4444" }}>P</span> PDF (.pdf)
              </button>
              <button onClick={() => { onPrint(); setShowExportMenu(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors" style={{ color: "var(--foreground)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                Print
              </button>
            </div>
          )}
        </div>
      </Grp>
    </div>
  );
}

/* ─── Tabbed Inspector Panel (right side) ─── */
function InspectorPanel({
  citations, open, onToggle, onClickCitation, onDelete,
  chatHistory, onUpdateChat, getContext,
}: {
  citations: CitationPayload[]; open: boolean; onToggle: () => void;
  onClickCitation: (c: CitationPayload) => void; onDelete: (id: string) => void;
  chatHistory: ChatMessage[]; onUpdateChat: (msgs: ChatMessage[]) => void;
  getContext: () => string;
}) {
  const [tab, setTab] = useState<"citations" | "ai" | "arxiv">("citations");

  // Auto-switch tabs from external events
  useEffect(() => {
    const handleArxiv = () => setTab("arxiv");
    const handleAi = () => setTab("ai");
    window.addEventListener("scribe:arxiv-search", handleArxiv);
    window.addEventListener("scribe:open-ai-tab", handleAi);
    window.addEventListener("scribe:ai-ask", handleAi);
    return () => {
      window.removeEventListener("scribe:arxiv-search", handleArxiv);
      window.removeEventListener("scribe:open-ai-tab", handleAi);
      window.removeEventListener("scribe:ai-ask", handleAi);
    };
  }, []);

  if (!open) {
    return (
      <div className="shrink-0 flex flex-col items-center gap-3 w-10 border-l h-full py-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <button onClick={() => { onToggle(); setTab("citations"); }} title="Citations" className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ color: "var(--purple)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" /></svg>
        </button>
        {citations.length > 0 && <span className="text-[8px] font-bold px-1 rounded-full" style={{ background: "var(--purple)", color: "#fff" }}>{citations.length}</span>}
        <button onClick={() => { onToggle(); setTab("arxiv"); }} title="Search Papers" className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ color: "var(--purple)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </button>
        <button onClick={() => { onToggle(); setTab("ai"); }} title="Research AI" className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors ai-glow-btn"
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          style={{ boxShadow: "0 0 8px rgba(124,58,237,0.25), 0 0 2px rgba(59,130,246,0.2)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="url(#ai-g2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <defs><linearGradient id="ai-g2" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor="#7C3AED" /><stop offset="100%" stopColor="#3B82F6" /></linearGradient></defs>
            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 flex flex-col border-l h-full" style={{ width: "280px", borderColor: "var(--border)", background: "var(--surface)" }}>
      {/* Tab bar */}
      <div className="flex shrink-0 border-b" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={() => setTab("citations")}
          className="flex-1 flex items-center justify-center gap-1.5 h-10 text-[11px] font-medium transition-colors relative"
          style={{ color: tab === "citations" ? "var(--purple)" : "var(--muted)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" /></svg>
          Citations
          {citations.length > 0 && <span className="text-[9px] font-bold px-1 rounded-full" style={{ background: "var(--purple-bg)", color: "var(--purple)" }}>{citations.length}</span>}
          {tab === "citations" && <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: "var(--purple)" }} />}
        </button>
        <button
          onClick={() => setTab("ai")}
          className="flex-1 flex items-center justify-center gap-1.5 h-10 text-[11px] font-medium transition-colors relative"
          style={{ color: tab === "ai" ? "var(--purple)" : "var(--muted)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={tab === "ai" ? "url(#ai-g3)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <defs><linearGradient id="ai-g3" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor="#7C3AED" /><stop offset="100%" stopColor="#3B82F6" /></linearGradient></defs>
            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
          </svg>
          AI
          {tab === "ai" && <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg, #7C3AED, #3B82F6)" }} />}
        </button>
        <button
          onClick={() => setTab("arxiv")}
          className="flex-1 flex items-center justify-center gap-1.5 h-10 text-[11px] font-medium transition-colors relative"
          style={{ color: tab === "arxiv" ? "var(--purple)" : "var(--muted)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          Papers
          {tab === "arxiv" && <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: "var(--purple)" }} />}
        </button>
        <button onClick={onToggle} className="flex items-center justify-center w-9 h-10 transition-colors" style={{ color: "var(--muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      {/* Tab content with slide animation */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {tab === "citations" ? (
            <motion.div key="citations" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.15 }} className="absolute inset-0 overflow-y-auto px-2 py-2">
              {citations.length === 0 ? (
                <div className="px-2 py-6 text-center">
                  <p className="text-[11px]" style={{ color: "var(--muted)" }}>No citations yet</p>
                  <p className="text-[10px] mt-1" style={{ color: "var(--muted)", opacity: 0.6 }}>Select text in the PDF and click Cite</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {citations.map((c, i) => (
                    <div key={c.id} className="group relative rounded-lg transition-colors cursor-pointer" style={{ background: "var(--purple-bg)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--purple-hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "var(--purple-bg)")}>
                      <button onClick={() => onClickCitation(c)} className="flex flex-col text-left p-2 w-full">
                        <div className="text-[10px] font-medium mb-1" style={{ color: "var(--purple)" }}>[{i + 1}] {c.authors || c.filename.replace(/\.pdf$/i, "")}{c.year ? ` (${c.year})` : ""}</div>
                        <div className="text-[11px] leading-relaxed" style={{ color: "var(--foreground)", opacity: 0.85 }}>&ldquo;{c.text.slice(0, 80)}{c.text.length > 80 ? "..." : ""}&rdquo;</div>
                        <div className="flex justify-end mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="flex items-center gap-0.5 text-[9px] font-medium" style={{ color: "var(--purple)" }}>
                            Go to source
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                          </span>
                        </div>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 flex items-center justify-center w-5 h-5 rounded transition-all" style={{ color: "var(--muted)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; e.currentTarget.style.color = "#ef4444"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted)"; }} title="Remove citation">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : tab === "ai" ? (
            <motion.div key="ai" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} transition={{ duration: 0.15 }} className="absolute inset-0">
              <AiChat chatHistory={chatHistory} onUpdateHistory={onUpdateChat} getContext={getContext} />
            </motion.div>
          ) : (
            <motion.div key="arxiv" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} transition={{ duration: 0.15 }} className="absolute inset-0">
              <ArxivSearch />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Find & Replace Bar ─── */
function FindReplaceBar({ editor, onClose }: { editor: TiptapEditor; onClose: () => void }) {
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);

  const clearHighlights = useCallback(() => {
    const el = document.querySelector(".tiptap") as HTMLElement | null;
    if (!el) return;
    el.querySelectorAll("mark[data-find-highlight]").forEach((m) => {
      const parent = m.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(m.textContent || ""), m);
        parent.normalize();
      }
    });
  }, []);

  const highlightMatches = useCallback((query: string) => {
    clearHighlights();
    if (!query) { setMatchCount(0); setCurrentMatch(0); return; }
    const el = document.querySelector(".tiptap") as HTMLElement | null;
    if (!el) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) textNodes.push(node);
    let count = 0;
    const lowerQ = query.toLowerCase();
    for (const tn of textNodes) {
      const text = tn.textContent || "";
      const lowerText = text.toLowerCase();
      if (!lowerText.includes(lowerQ)) continue;
      const frag = document.createDocumentFragment();
      let lastIdx = 0;
      let idx = lowerText.indexOf(lowerQ, 0);
      while (idx !== -1) {
        if (idx > lastIdx) frag.appendChild(document.createTextNode(text.slice(lastIdx, idx)));
        const mark = document.createElement("mark");
        mark.setAttribute("data-find-highlight", "true");
        mark.style.background = "rgba(250,204,21,0.5)";
        mark.style.borderRadius = "2px";
        mark.textContent = text.slice(idx, idx + query.length);
        frag.appendChild(mark);
        count++;
        lastIdx = idx + query.length;
        idx = lowerText.indexOf(lowerQ, lastIdx);
      }
      if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      tn.parentNode?.replaceChild(frag, tn);
    }
    setMatchCount(count);
    setCurrentMatch(count > 0 ? 1 : 0);
  }, [clearHighlights]);

  const goToMatch = useCallback((idx: number) => {
    const marks = document.querySelectorAll("mark[data-find-highlight]");
    if (marks.length === 0) return;
    marks.forEach((m) => ((m as HTMLElement).style.background = "rgba(250,204,21,0.5)"));
    const target = marks[idx - 1] as HTMLElement | undefined;
    if (target) {
      target.style.background = "rgba(234,88,12,0.6)";
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, []);

  const handleNext = useCallback(() => {
    if (matchCount === 0) return;
    const next = currentMatch >= matchCount ? 1 : currentMatch + 1;
    setCurrentMatch(next);
    goToMatch(next);
  }, [currentMatch, matchCount, goToMatch]);

  const handlePrev = useCallback(() => {
    if (matchCount === 0) return;
    const prev = currentMatch <= 1 ? matchCount : currentMatch - 1;
    setCurrentMatch(prev);
    goToMatch(prev);
  }, [currentMatch, matchCount, goToMatch]);

  const handleReplace = useCallback(() => {
    if (matchCount === 0 || !findQuery) return;
    const marks = document.querySelectorAll("mark[data-find-highlight]");
    const target = marks[currentMatch - 1];
    if (target) {
      target.replaceWith(document.createTextNode(replaceQuery));
      // Re-sync editor content from DOM
      const el = document.querySelector(".tiptap") as HTMLElement | null;
      if (el) editor.commands.setContent(el.innerHTML);
      highlightMatches(findQuery);
    }
  }, [editor, findQuery, replaceQuery, currentMatch, matchCount, highlightMatches]);

  const handleReplaceAll = useCallback(() => {
    if (matchCount === 0 || !findQuery) return;
    const marks = document.querySelectorAll("mark[data-find-highlight]");
    marks.forEach((m) => m.replaceWith(document.createTextNode(replaceQuery)));
    const el = document.querySelector(".tiptap") as HTMLElement | null;
    if (el) editor.commands.setContent(el.innerHTML);
    setMatchCount(0);
    setCurrentMatch(0);
  }, [editor, findQuery, replaceQuery, matchCount]);

  const handleClose = useCallback(() => {
    clearHighlights();
    onClose();
  }, [clearHighlights, onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleClose]);

  useEffect(() => {
    const timer = setTimeout(() => highlightMatches(findQuery), 200);
    return () => clearTimeout(timer);
  }, [findQuery, highlightMatches]);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0" style={{ borderColor: "var(--border)", background: "var(--toolbar-bg)" }}>
      <input value={findQuery} onChange={(e) => setFindQuery(e.target.value)} placeholder="Find..." className="h-6 px-2 text-[11px] rounded border outline-none w-36" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
        onKeyDown={(e) => { if (e.key === "Enter") handleNext(); }} autoFocus />
      <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>{matchCount > 0 ? `${currentMatch}/${matchCount}` : "0"}</span>
      <Btn onClick={handlePrev} title="Previous"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg></Btn>
      <Btn onClick={handleNext} title="Next"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 6 15 12 9 18" /></svg></Btn>
      <div className="w-px h-4" style={{ background: "var(--border)" }} />
      <input value={replaceQuery} onChange={(e) => setReplaceQuery(e.target.value)} placeholder="Replace..." className="h-6 px-2 text-[11px] rounded border outline-none w-36" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
        onKeyDown={(e) => { if (e.key === "Enter") handleReplace(); }} />
      <Btn onClick={handleReplace} title="Replace"><span className="text-[10px]">Replace</span></Btn>
      <Btn onClick={handleReplaceAll} title="Replace All"><span className="text-[10px]">All</span></Btn>
      <div className="flex-1" />
      <Btn onClick={handleClose} title="Close">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </Btn>
    </div>
  );
}

/* ─── Editor ─── */
export default function Editor({
  projectId,
  initialContent,
  initialCitations,
  onContentChange,
  onCitationsChange,
  projectName,
  chatHistory: initialChatHistory,
  onUpdateChat,
  getContext,
}: {
  projectId: string;
  initialContent: string;
  initialCitations: CitationRecord[];
  onContentChange: (html: string) => void;
  onCitationsChange?: (citations: CitationRecord[]) => void;
  projectName: string;
  chatHistory: ChatMessage[];
  onUpdateChat: (msgs: ChatMessage[]) => void;
  getContext: () => string;
}) {
  const [citations, setCitations] = useState<CitationPayload[]>(
    initialCitations.map((c) => ({ ...c }))
  );
  const [panelOpen, setPanelOpen] = useState(true);
  const editorRef = useRef<TiptapEditor | null>(null);
  const contentChangeRef = useRef(onContentChange);
  const citationsChangeRef = useRef(onCitationsChange);
  const initializedRef = useRef(false);
  const swappingRef = useRef(false);
  contentChangeRef.current = onContentChange;
  citationsChangeRef.current = onCitationsChange;

  // ─── Tabs ───
  const [tabs, setTabs] = useState<EditorTab[]>([
    { id: "main", label: "Untitled 1", content: initialContent },
  ]);
  const [activeTabId, setActiveTabId] = useState("main");
  const tabCounter = useRef(1);

  const addTab = useCallback(() => {
    tabCounter.current += 1;
    const newTab: EditorTab = { id: crypto.randomUUID(), label: `Untitled ${tabCounter.current}`, content: "" };
    setTabs((prev) => [...prev, newTab]);
    // Save current tab content
    const ed = editorRef.current;
    if (ed) {
      const html = ed.getHTML();
      setTabs((prev) => prev.map((t) => t.id === activeTabId ? { ...t, content: html } : t));
    }
    setActiveTabId(newTab.id);
    if (ed) {
      swappingRef.current = true;
      queueMicrotask(() => {
        ed.commands.setContent("");
        swappingRef.current = false;
      });
    }
  }, [activeTabId]);

  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex((t) => t.id === tabId);
      const next = prev.filter((t) => t.id !== tabId);
      if (tabId === activeTabId) {
        const newActive = next[Math.min(idx, next.length - 1)];
        setActiveTabId(newActive.id);
        const ed = editorRef.current;
        if (ed) {
          swappingRef.current = true;
          queueMicrotask(() => {
            ed.commands.setContent(newActive.content);
            swappingRef.current = false;
          });
        }
      }
      return next;
    });
  }, [activeTabId]);

  const switchTab = useCallback((tabId: string) => {
    if (tabId === activeTabId) return;
    const ed = editorRef.current;
    if (ed) {
      const html = ed.getHTML();
      setTabs((prev) => prev.map((t) => t.id === activeTabId ? { ...t, content: html } : t));
    }
    setActiveTabId(tabId);
    const target = tabs.find((t) => t.id === tabId);
    if (ed && target) {
      swappingRef.current = true;
      queueMicrotask(() => {
        ed.commands.setContent(target.content);
        swappingRef.current = false;
      });
    }
  }, [activeTabId, tabs]);

  // ─── Version History ───
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const lastSavedContentRef = useRef(initialContent);

  // ─── Find & Replace ───
  const [showFindReplace, setShowFindReplace] = useState(false);

  // ─── Comments ───
  const [comments, setComments] = useState<{ id: string; text: string; comment: string; from: number; to: number }[]>([]);

  // ─── Word Goal ───
  const [wordGoal, setWordGoal] = useState(0);

  // Load word goal from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`scribe-word-goal-${projectId}`);
    if (stored) setWordGoal(parseInt(stored, 10) || 0);
  }, [projectId]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: "Start writing your notes..." }),
      Underline,
      TextStyleKit,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Subscript,
      Superscript,
      CitationNode,
      Image.configure({ inline: false, allowBase64: true, HTMLAttributes: { draggable: "true" } }),
      TableKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "editor-link" } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
      CharacterCount,
      Dropcursor.configure({ color: "var(--purple)", width: 2 }),
      CommentMark,
    ],
    content: "",
    onUpdate: ({ editor: e }) => {
      if (!initializedRef.current || swappingRef.current) return;
      contentChangeRef.current(e.getHTML());
    },
    editorProps: { attributes: { class: "tiptap", spellcheck: "true" } },
  });

  editorRef.current = editor;

  const handleAddComment = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) { toast.error("Select text to comment on"); return; }
    const selectedText = editor.state.doc.textBetween(from, to);
    const comment = window.prompt("Add a comment:");
    if (!comment) return;
    const id = crypto.randomUUID();
    editor.chain().focus().setMark("comment", { comment, id }).run();
    setComments((prev) => [...prev, { id, text: selectedText, comment, from, to }]);
  }, [editor]);

  // Set initial content once — deferred to avoid flushSync during render
  useEffect(() => {
    if (!editor || initializedRef.current) return;
    queueMicrotask(() => {
      if (initialContent) {
        editor.commands.setContent(initialContent);
      }
      initializedRef.current = true;
    });
  }, [editor, initialContent]);

  // Listen for cite events — insert as inline APA text
  useEffect(() => {
    const handleCite = (e: Event) => {
      const payload = (e as CustomEvent<CitationPayload>).detail;
      if (!payload) return;
      const ed = editorRef.current;
      if (!ed) return;

      setCitations((prev) => {
        const next = [...prev, payload];
        citationsChangeRef.current?.(next);
        return next;
      });

      // APA 7th in-text citation — deferred to avoid flushSync warning
      queueMicrotask(() => {
        // APA format: (Authors, Year, p. X)
        const authors = payload.authors || payload.filename.replace(/\.pdf$/i, "");
        const year = payload.year || "n.d.";
        const apaRef = `(${authors}, ${year})`;
        // Clean up line breaks and extra whitespace from PDF text
        const cleanText = payload.text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

        ed.chain()
          .focus("end")
          .insertContent(`<p>"${cleanText}" ${apaRef}</p>`)
          .run();
      });
    };
    window.addEventListener("scribe:cite", handleCite);
    return () => window.removeEventListener("scribe:cite", handleCite);
  }, []);

  // Open panel when AI or arXiv is triggered externally
  useEffect(() => {
    const handler = () => { setPanelOpen(true); };
    window.addEventListener("scribe:arxiv-search", handler);
    window.addEventListener("scribe:open-ai-tab", handler);
    window.addEventListener("scribe:ai-ask", handler);
    return () => {
      window.removeEventListener("scribe:arxiv-search", handler);
      window.removeEventListener("scribe:open-ai-tab", handler);
      window.removeEventListener("scribe:ai-ask", handler);
    };
  }, []);

  // Listen for snapshot events from PDF viewer
  useEffect(() => {
    const handleSnap = (e: Event) => {
      const dataUrl = (e as CustomEvent<string>).detail;
      if (!dataUrl) return;
      const ed = editorRef.current;
      if (!ed) return;
      queueMicrotask(() => {
        ed.chain().focus("end").setImage({ src: dataUrl }).run();
      });
    };
    window.addEventListener("scribe:snapshot", handleSnap);
    return () => window.removeEventListener("scribe:snapshot", handleSnap);
  }, []);

  // Listen for AI push-to-editor events
  useEffect(() => {
    const handleAiInsert = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (!text) return;
      const ed = editorRef.current;
      if (!ed) return;
      queueMicrotask(() => {
        ed.chain().focus("end").insertContent(`<blockquote><p>${text.replace(/\n/g, "<br>")}</p></blockquote><p></p>`).run();
      });
    };
    window.addEventListener("scribe:ai-insert", handleAiInsert);
    return () => window.removeEventListener("scribe:ai-insert", handleAiInsert);
  }, []);

  // Word count & reading time
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [saveFlash, setSaveFlash] = useState(false);

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const text = editor.getText();
      const words = text.split(/\s+/).filter(Boolean).length;
      setWordCount(words);
      setCharCount(text.length);
    };
    update();
    editor.on("update", update);
    return () => { editor.off("update", update); };
  }, [editor]);

  // Flash save indicator when content changes
  useEffect(() => {
    if (!editor || !initializedRef.current) return;
    const flash = () => {
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1200);
    };
    editor.on("update", flash);
    return () => { editor.off("update", flash); };
  }, [editor]);

  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // ─── Version auto-save every 30s ───
  useEffect(() => {
    if (!editor) return;
    const interval = setInterval(() => {
      const html = editor.getHTML();
      if (html === lastSavedContentRef.current) return;
      lastSavedContentRef.current = html;
      const snapshot: VersionSnapshot = { id: crypto.randomUUID(), content: html, timestamp: Date.now() };
      db.projects.get(projectId).then((project) => {
        if (!project) return;
        const versions = [...(project.versions || []), snapshot];
        // FIFO: max 50
        while (versions.length > 50) versions.shift();
        db.projects.update(projectId, { versions });
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [editor, projectId]);

  const handleRestoreVersion = useCallback((content: string) => {
    if (!editor) return;
    swappingRef.current = true;
    queueMicrotask(() => {
      editor.commands.setContent(content);
      swappingRef.current = false;
      contentChangeRef.current(content);
      lastSavedContentRef.current = content;
    });
    setShowVersionHistory(false);
    toast.success("Version restored");
  }, [editor]);

  // Click citation in panel → navigate to PDF location
  const goToCitation = useCallback((c: CitationPayload) => {
    window.dispatchEvent(
      new CustomEvent("scribe:goto-citation", { detail: c })
    );
  }, []);

  // Delete a citation from the panel
  const deleteCitation = useCallback((id: string) => {
    setCitations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      citationsChangeRef.current?.(next);
      return next;
    });
    // Tell PDF viewer to remove the corresponding highlight
    window.dispatchEvent(new CustomEvent("scribe:citation-deleted", { detail: id }));
  }, []);

  const handleExportWord = useCallback(() => {
    if (!editor) return;
    exportToWord(editor.getHTML(), projectName);
  }, [editor, projectName]);

  const handleExportPdf = useCallback(() => {
    if (!editor) return;
    exportToPdf(editor.getHTML(), projectName);
  }, [editor, projectName]);

  const handlePrint = useCallback(() => {
    if (!editor) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${projectName}</title><style>body{font-family:"Space Grotesk",system-ui,sans-serif;padding:40px;max-width:800px;margin:0 auto;font-size:15px;line-height:1.75}h1{font-size:1.875rem;font-weight:700}h2{font-size:1.375rem;font-weight:600}h3{font-size:1.125rem;font-weight:600}blockquote{border-left:3px solid #6D28D9;padding-left:1rem;color:#71717a}table{border-collapse:collapse;width:100%}th,td{border:1px solid #E8E8E8;padding:0.5rem 0.75rem;text-align:left}th{background:#FAFAFA;font-weight:600}ul[data-type="taskList"]{list-style:none;padding-left:0}ul[data-type="taskList"] li{display:flex;align-items:flex-start;gap:0.5rem}</style></head><body>${editor.getHTML()}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }, [editor, projectName]);

  // Generate APA reference list from citations
  const generateReferenceList = useCallback(() => {
    if (!editor || citations.length === 0) return;
    // One reference per unique source (by filename), no page numbers
    const seen = new Map<string, { authors: string; year: string; filename: string }>();
    for (const c of citations) {
      if (!seen.has(c.filename)) {
        seen.set(c.filename, {
          authors: c.authors || c.filename.replace(/\.pdf$/i, ""),
          year: c.year || "n.d.",
          filename: c.filename,
        });
      }
    }
    const refs = Array.from(seen.values()).map(
      (s) => `<p>${s.authors} (${s.year}). <em>${s.filename.replace(/\.pdf$/i, "")}</em>.</p>`
    );
    const html = `<h2>References</h2><hr>${refs.join("")}`;
    queueMicrotask(() => {
      editor.chain().focus("end").insertContent(html).run();
    });
    toast.success("Reference list generated");
  }, [editor, citations]);

  // Listen for export commands from command palette
  useEffect(() => {
    const onWord = () => handleExportWord();
    const onPdf = () => handleExportPdf();
    window.addEventListener("scribe:export-word", onWord);
    window.addEventListener("scribe:export-pdf", onPdf);
    return () => { window.removeEventListener("scribe:export-word", onWord); window.removeEventListener("scribe:export-pdf", onPdf); };
  }, [handleExportWord, handleExportPdf]);

  // Page tracking
  const PAGE_H = 1056;
  const PAGE_GAP = 32;

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Recalculate pages from content height
  useEffect(() => {
    if (!editor) return;
    const recalc = () => {
      const el = wrapperRef.current?.querySelector(".tiptap") as HTMLElement | null;
      if (!el) return;
      const h = el.scrollHeight;
      setTotalPages(Math.max(1, Math.ceil(h / PAGE_H)));
    };
    recalc();
    const obs = new MutationObserver(recalc);
    const el = wrapperRef.current?.querySelector(".tiptap");
    if (el) obs.observe(el, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", recalc);
    return () => { obs.disconnect(); window.removeEventListener("resize", recalc); };
  }, [editor]);

  // Track visible page on scroll
  useEffect(() => {
    const c = scrollContainerRef.current;
    if (!c) return;
    const onScroll = () => {
      // Account for top padding (32px) + page breaks
      const scrollTop = c.scrollTop;
      const effectivePageH = PAGE_H + PAGE_GAP;
      const p = Math.max(1, Math.floor((scrollTop + PAGE_H / 3) / effectivePageH) + 1);
      setCurrentPage(Math.min(p, totalPages));
    };
    c.addEventListener("scroll", onScroll, { passive: true });
    return () => c.removeEventListener("scroll", onScroll);
  }, [totalPages]);

  const goToPage = useCallback((p: number) => {
    scrollContainerRef.current?.scrollTo({
      top: (p - 1) * (PAGE_H + PAGE_GAP),
      behavior: "smooth",
    });
  }, []);

  if (!editor) return null;

  // Wrapper height: pages * page_height + breaks between + padding/gaps
  const wrapperMinH = totalPages * PAGE_H + (totalPages - 1) * PAGE_GAP;

  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1 min-w-0">
        {/* Tab bar */}
        <div className="flex items-center shrink-0 border-b" style={{ borderColor: "var(--border)", background: "var(--toolbar-bg)" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              onDoubleClick={(e) => { e.stopPropagation(); setRenamingTabId(tab.id); setRenameValue(tab.label); }}
              className="flex items-center gap-1 px-3 h-8 text-[11px] font-medium border-r transition-colors relative"
              style={{
                borderColor: "var(--border)",
                background: tab.id === activeTabId ? "var(--tab-active)" : "var(--tab-inactive)",
                color: tab.id === activeTabId ? "var(--foreground)" : "var(--muted)",
              }}
            >
              {renamingTabId === tab.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => { setTabs((prev) => prev.map((t) => t.id === tab.id ? { ...t, label: renameValue.trim() || t.label } : t)); setRenamingTabId(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { setTabs((prev) => prev.map((t) => t.id === tab.id ? { ...t, label: renameValue.trim() || t.label } : t)); setRenamingTabId(null); } if (e.key === "Escape") setRenamingTabId(null); }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-20 bg-transparent border-b outline-none text-[11px]"
                  style={{ color: "var(--foreground)", borderColor: "var(--purple)" }}
                />
              ) : (
                tab.label
              )}
              {tabs.length > 1 && (
                <span
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  className="ml-1 flex items-center justify-center w-4 h-4 rounded transition-colors"
                  title="Close tab"
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </span>
              )}
              {tab.id === activeTabId && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--purple)" }} />}
            </button>
          ))}
          <button onClick={addTab} className="flex items-center justify-center w-8 h-8 text-[11px] transition-colors" style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")} title="New tab">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
        </div>

        <Toolbar editor={editor} onExportWord={handleExportWord} onExportPdf={handleExportPdf} onGenerateRefs={generateReferenceList} onShowHistory={() => setShowVersionHistory(true)} onToggleFindReplace={() => setShowFindReplace(!showFindReplace)} onPrint={handlePrint} onAddComment={handleAddComment} />
        <TableToolbar editor={editor} />
        {showFindReplace && <FindReplaceBar editor={editor} onClose={() => setShowFindReplace(false)} />}

        {/* Paginated editor */}
        <div ref={scrollContainerRef} className="flex-1 overflow-auto editor-scroll-area" style={{ background: "var(--background)" }}>
          <div style={{ padding: `${PAGE_GAP}px 0` }}>
            <div ref={wrapperRef} className="editor-paginated-wrapper" style={{ minHeight: wrapperMinH }}>
              {/* Page background sheets */}
              {Array.from({ length: totalPages }, (_, i) => (
                <div
                  key={`bg-${i}`}
                  className="editor-page-bg"
                  style={{ top: i * (PAGE_H + PAGE_GAP) }}
                />
              ))}

              {/* Page break lines between pages */}
              {Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => (
                <div
                  key={`br-${i}`}
                  className="editor-page-break"
                  style={{ top: (i + 1) * PAGE_H + i * PAGE_GAP }}
                >
                  <div className="editor-page-break-line" />
                  <div className="editor-page-break-label">
                    Page {i + 2}
                  </div>
                </div>
              ))}

              {/* The actual editor — single continuous editable surface */}
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="status-bar">
          {/* Page navigation */}
          <div className="status-bar-item">
            <button onClick={() => goToPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}
              className="flex items-center justify-center w-5 h-5 rounded transition-colors disabled:opacity-30" style={{ color: "var(--muted)" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <span className="tabular-nums">Page {currentPage}/{totalPages}</span>
            <button onClick={() => goToPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}
              className="flex items-center justify-center w-5 h-5 rounded transition-colors disabled:opacity-30" style={{ color: "var(--muted)" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 6 15 12 9 18" /></svg>
            </button>
          </div>

          <div className="w-px h-3" style={{ background: "var(--border)" }} />

          {/* Word count */}
          <div className="status-bar-item">
            <span>{wordCount.toLocaleString()} words &middot; {charCount.toLocaleString()} chars</span>
          </div>

          {comments.length > 0 && (
            <>
              <div className="w-px h-3" style={{ background: "var(--border)" }} />
              <div className="status-bar-item">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                <span>{comments.length} comment{comments.length !== 1 ? "s" : ""}</span>
              </div>
            </>
          )}

          <div className="flex-1" />

          {/* Save indicator */}
          <div className={`status-bar-item ${saveFlash ? "save-pulse" : ""}`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: saveFlash ? "var(--purple)" : "var(--muted)" }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{ color: saveFlash ? "var(--purple)" : undefined }}>Saved locally</span>
          </div>
        </div>
      </div>
      <InspectorPanel
        citations={citations} open={panelOpen} onToggle={() => setPanelOpen(!panelOpen)}
        onClickCitation={goToCitation} onDelete={deleteCitation}
        chatHistory={initialChatHistory} onUpdateChat={onUpdateChat} getContext={getContext}
      />

      {/* Version History Modal */}
      {showVersionHistory && (
        <VersionHistoryWrapper projectId={projectId} onRestore={handleRestoreVersion} onClose={() => setShowVersionHistory(false)} />
      )}
    </div>
  );
}

/* ─── Version History Wrapper (reads versions from DB) ─── */
function VersionHistoryWrapper({ projectId, onRestore, onClose }: { projectId: string; onRestore: (content: string) => void; onClose: () => void }) {
  const [versions, setVersions] = useState<VersionSnapshot[]>([]);
  useEffect(() => {
    db.projects.get(projectId).then((p) => {
      if (p) setVersions(p.versions || []);
    });
  }, [projectId]);
  return <VersionHistory versions={versions} onRestore={onRestore} onClose={onClose} />;
}
