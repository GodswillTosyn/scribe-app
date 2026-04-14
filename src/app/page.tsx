"use client";

import { useState, useEffect } from "react";
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

  const createProject = async () => {
    setCreating(true);
    const id = crypto.randomUUID();
    const now = Date.now();
    await db.projects.add({
      id,
      name: "Untitled Project",
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
        className="grid grid-cols-3 items-center px-6 h-14 shrink-0 border-b"
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

        {/* Center — Nav links */}
        <div className="flex items-center justify-center gap-1">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{ background: "var(--purple-bg)", color: "var(--purple)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Home
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Recent
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Starred
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Trash
          </button>
        </div>

        {/* Right — Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={createProject}
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
            <div className="flex flex-col items-center py-20 rounded-2xl border border-dashed" style={{ borderColor: "var(--purple-border)", background: "var(--panel-bg)" }}>
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5" style={{ background: "linear-gradient(135deg, var(--purple-bg), rgba(109,40,217,0.12))" }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--purple)" }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>
              <p className="text-base font-semibold mb-1" style={{ color: "var(--foreground)" }}>No projects yet</p>
              <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>Create your first project to get started</p>
              <button onClick={createProject} disabled={creating} className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "var(--purple)", color: "#fff", boxShadow: "0 4px 14px rgba(109,40,217,0.25)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--purple-soft)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--purple)")}>
                Create Project
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
    </div>
  );
}
