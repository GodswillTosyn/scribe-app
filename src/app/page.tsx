"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db, type Project } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import dynamic from "next/dynamic";
import Link from "next/link";

const ThemeToggle = dynamic(() => import("@/components/theme-toggle"), { ssr: false });
const WelcomeModal = dynamic(() => import("@/components/welcome-modal"), { ssr: false });

export default function Home() {
  const router = useRouter();
  const projects = useLiveQuery(() =>
    db.projects.orderBy("updatedAt").reverse().toArray()
  );
  const [creating, setCreating] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("Untitled Project");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const openNewProjectModal = () => {
    setNewProjectName("Untitled Project");
    setShowNewModal(true);
    setTimeout(() => nameInputRef.current?.select(), 50);
  };

  const createProject = async (name?: string) => {
    setCreating(true);
    setShowNewModal(false);
    const id = crypto.randomUUID();
    const now = Date.now();
    await db.projects.add({
      id,
      name: name || newProjectName || "Untitled Project",
      content: "",
      pdfs: [],
      activePdfId: "",
      citations: [],
      chatHistory: [],
      versions: [],
      createdAt: now,
      updatedAt: now,
    });
    router.push(`/project/${id}`);
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this project?")) {
      await db.projects.delete(id);
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Nav */}
      <nav
        className="landing-nav flex justify-between items-center px-6 h-14 shrink-0 border-b"
        style={{ borderColor: "var(--border)", background: "var(--panel-bg)" }}
      >
        {/* Left — Logo */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-md"
            style={{ background: "var(--purple)", color: "#fff" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
            SCRIBE
          </span>
        </div>

        {/* Right — Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={openNewProjectModal}
            disabled={creating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
            style={{ background: "var(--purple)", color: "#fff" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--purple-soft)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--purple)")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New
          </button>
          <ThemeToggle />
          <div
            className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold cursor-pointer"
            style={{ background: "var(--purple-bg)", color: "var(--purple)", border: "1px solid var(--purple-border)" }}
          >
            U
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-auto" style={{ background: "var(--background)" }}>
        <div className="max-w-3xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
              Your Projects
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              {projects?.length ?? 0} project{(projects?.length ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Projects grid */}
          {!projects ? (
            <div className="text-sm" style={{ color: "var(--muted)" }}>Loading...</div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <h2 className="text-3xl font-bold tracking-tight text-center mb-3" style={{ color: "var(--foreground)" }}>
                Your AI-Powered Research Environment
              </h2>
              <p className="text-base text-center max-w-md mb-10" style={{ color: "var(--muted)" }}>
                Upload PDFs, cite with one click, and draft research notes with AI context.
              </p>

              {/* Feature cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-10">
                <div className="flex flex-col items-center text-center p-5 rounded-xl" style={{ background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: "var(--purple-bg)" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--purple)" }}>
                      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--foreground)" }}>Smart Citations</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Auto APA format</p>
                </div>
                <div className="flex flex-col items-center text-center p-5 rounded-xl" style={{ background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: "var(--purple-bg)" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--purple)" }}>
                      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--foreground)" }}>AI Research Assistant</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Ask questions about your PDFs</p>
                </div>
                <div className="flex flex-col items-center text-center p-5 rounded-xl" style={{ background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: "var(--purple-bg)" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--purple)" }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--foreground)" }}>Export Anywhere</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Word &amp; PDF export</p>
                </div>
              </div>

              <button onClick={openNewProjectModal} disabled={creating} className="px-6 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "var(--purple)", color: "#fff", boxShadow: "0 4px 14px rgba(109,40,217,0.25)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--purple-soft)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--purple)")}>
                Start Your First Project
              </button>
            </div>
          ) : (
            <div className="landing-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => router.push(`/project/${p.id}`)}
                  className="group relative rounded-2xl overflow-hidden cursor-pointer"
                  style={{
                    background: "var(--panel-bg)",
                    border: "1px solid var(--border)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    transition: "all 0.25s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 12px 32px rgba(109,40,217,0.12), 0 4px 12px rgba(0,0,0,0.06)";
                    e.currentTarget.style.borderColor = "var(--purple-border)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  {/* Image area — gradient with doc icon */}
                  <div
                    className="relative h-36 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, var(--purple-bg) 0%, rgba(109,40,217,0.08) 50%, var(--surface) 100%)" }}
                  >
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(109,40,217,0.12)", backdropFilter: "blur(8px)" }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--purple)" }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" />
                      </svg>
                    </div>
                    {/* Delete button */}
                    <button
                      className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      style={{ background: "rgba(239,68,68,0.1)", backdropFilter: "blur(8px)" }}
                      onClick={(e) => deleteProject(p.id, e)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                    {/* Stats badges */}
                    <div className="absolute bottom-3 left-3 flex gap-1.5">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium" style={{ background: "rgba(109,40,217,0.12)", color: "var(--purple)", backdropFilter: "blur(8px)" }}>
                        {p.pdfs.length} PDF{p.pdfs.length !== 1 ? "s" : ""}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium" style={{ background: "rgba(109,40,217,0.12)", color: "var(--purple)", backdropFilter: "blur(8px)" }}>
                        {p.citations.length} cite{p.citations.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  {/* Content */}
                  <div className="p-4">
                    <h3 className="text-sm font-semibold truncate mb-1" style={{ color: "var(--foreground)" }}>
                      {p.name}
                    </h3>
                    <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                      Last edited {formatDate(p.updatedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Privacy badge */}
        <div className="flex items-center justify-center gap-2 pt-10 pb-6">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--muted)", opacity: 0.6 }}
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-[11px]" style={{ color: "var(--muted)", opacity: 0.6 }}>
            Your data stays in your browser. Nothing is uploaded to any server.
          </span>
          <span className="text-[11px]" style={{ color: "var(--muted)", opacity: 0.4 }}>
            &middot;
          </span>
          <Link
            href="/privacy"
            className="text-[11px] no-underline transition-colors"
            style={{ color: "var(--purple)", opacity: 0.6 }}
          >
            Privacy
          </Link>
        </div>
      </div>

      <WelcomeModal />

      {/* New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowNewModal(false)}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4" style={{ color: "var(--foreground)" }}>New Project</h3>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--muted)" }}>Project name</label>
            <input
              ref={nameInputRef}
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createProject(newProjectName); }}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-5"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNewModal(false)} className="px-4 py-2 rounded-lg text-xs font-medium transition-colors" style={{ color: "var(--muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                Cancel
              </button>
              <button onClick={() => createProject(newProjectName)} disabled={creating} className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: "var(--purple)", color: "#fff" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--purple-soft)")} onMouseLeave={(e) => (e.currentTarget.style.background = "var(--purple)")}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
