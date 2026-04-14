"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";

const ThemeToggle = dynamic(() => import("@/components/theme-toggle"), { ssr: false });
const WelcomeModal = dynamic(() => import("@/components/welcome-modal"), { ssr: false });

export default function Home() {
  const router = useRouter();
  const projects = useLiveQuery(() => db.projects.orderBy("updatedAt").reverse().toArray());
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
      id, name: name || newProjectName || "Untitled Project", content: "", pdfs: [], activePdfId: "",
      citations: [], chatHistory: [], versions: [], createdAt: now, updatedAt: now,
    });
    router.push(`/project/${id}`);
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this project?")) await db.projects.delete(id);
  };

  const formatDate = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return new Date(ts).toLocaleDateString();
  };

  const hasProjects = projects && projects.length > 0;

  return (
    <div className="flex flex-col h-screen">
      {/* Nav — minimal, breathable */}
      <nav className="landing-nav flex justify-between items-center px-6 h-14 shrink-0 border-b" style={{ borderColor: "var(--border)", background: "var(--panel-bg)" }}>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: "var(--purple)", color: "#fff" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
          </div>
          <span className="text-[15px] font-bold tracking-tight" style={{ color: "var(--foreground)" }}>scribe</span>
        </div>
        <div className="flex items-center gap-2">
          {hasProjects && (
            <button onClick={openNewProjectModal} disabled={creating} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: "var(--purple)", color: "#fff" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--purple-soft)")} onMouseLeave={(e) => (e.currentTarget.style.background = "var(--purple)")}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New project
            </button>
          )}
          <ThemeToggle />
        </div>
      </nav>

      <div className="flex-1 overflow-auto" style={{ background: "var(--background)" }}>
        {/* ─── Hero (no projects) ─── */}
        {projects && !hasProjects && (
          <div className="relative overflow-hidden">
            {/* Background texture — subtle dot grid */}
            <div className="absolute inset-0" style={{
              backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              opacity: 0.4,
            }} />
            {/* Purple glow */}
            <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle, rgba(109,40,217,0.08) 0%, transparent 70%)" }} />

            <div className="relative max-w-2xl mx-auto px-6 pt-20 pb-16">
              {/* Badge */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="flex justify-center mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium"
                  style={{ background: "var(--purple-bg)", color: "var(--purple)", border: "1px solid var(--purple-border)" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--purple)" }} />
                  AI-powered research tool
                </span>
              </motion.div>

              {/* Heading — asymmetric emphasis */}
              <motion.h1 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="text-center text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-5" style={{ color: "var(--foreground)" }}>
                Read. Cite.{" "}
                <span style={{ background: "linear-gradient(135deg, #7C3AED, #3B82F6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Write.
                </span>
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="text-center text-base sm:text-lg max-w-md mx-auto mb-10 leading-relaxed" style={{ color: "var(--muted)" }}>
                Upload your PDFs, cite with one click, and draft research notes — with an AI assistant that actually reads your sources.
              </motion.p>

              {/* CTA */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="flex justify-center mb-16">
                <button onClick={openNewProjectModal} disabled={creating}
                  className="group flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: "var(--purple)", color: "#fff", boxShadow: "0 4px 20px rgba(109,40,217,0.3)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--purple-soft)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(109,40,217,0.4)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--purple)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(109,40,217,0.3)"; }}>
                  Start your first project
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </button>
              </motion.div>

              {/* Feature row — asymmetric, not identical boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" /></svg>, label: "One-click APA citations", delay: 0.5 },
                  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="url(#fg1)" strokeWidth="1.5"><defs><linearGradient id="fg1" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor="#7C3AED" /><stop offset="100%" stopColor="#3B82F6" /></linearGradient></defs><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>, label: "AI that reads your PDFs", delay: 0.6 },
                  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>, label: "100% private, runs locally", delay: 0.7 },
                ].map((f, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: f.delay }}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
                    style={{ background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--purple-bg)", color: "var(--purple)" }}>
                      {f.icon}
                    </div>
                    <span className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>{f.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Projects dashboard ─── */}
        {hasProjects && (
          <div className="flex min-h-full">
            {/* Sidebar */}
            <div className="hidden md:flex flex-col shrink-0 w-56 border-r py-6 px-4" style={{ borderColor: "var(--border)", background: "var(--panel-bg)" }}>
              <div className="flex items-center gap-2 px-2 py-2 rounded-lg mb-1" style={{ background: "var(--purple-bg)", color: "var(--purple)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                <span className="text-xs font-semibold">All Projects</span>
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--purple)", color: "#fff" }}>{projects.length}</span>
              </div>
              <button className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-colors" style={{ color: "var(--muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                Recent
              </button>

              <div className="mt-auto pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="px-2 py-2 rounded-lg text-[11px]" style={{ color: "var(--muted)", background: "var(--surface)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    <span className="font-medium">Stored locally</span>
                  </div>
                  <p style={{ opacity: 0.7, lineHeight: 1.4 }}>Your data never leaves this browser.</p>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 px-6 md:px-8 py-6">
              <div className="flex items-baseline justify-between mb-5">
                <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>All Projects</h1>
                <span className="text-xs" style={{ color: "var(--muted)" }}>{projects.length} project{projects.length !== 1 ? "s" : ""}</span>
              </div>

              <div className="landing-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {projects.map((p, i) => {
                  const wordCount = p.content ? p.content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length : 0;
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => router.push(`/project/${p.id}`)}
                      className="group relative cursor-pointer"
                      style={{ transition: "all 0.25s ease" }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
                    >
                      {/* Folder tab */}
                      <div className="flex items-end">
                        <div className="h-5 w-24 rounded-t-lg" style={{ background: "rgba(109,40,217,0.08)" }} />
                      </div>
                      {/* Card body */}
                      <div className="rounded-b-2xl rounded-tr-2xl overflow-hidden" style={{
                        background: "rgba(109,40,217,0.04)",
                        border: "1px solid rgba(109,40,217,0.1)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                        transition: "all 0.25s ease",
                      }}
                        ref={(el) => {
                          if (!el) return;
                          const parent = el.closest("[class*='group']");
                          if (parent) {
                            parent.addEventListener("mouseenter", () => { el.style.borderColor = "rgba(109,40,217,0.25)"; el.style.boxShadow = "0 8px 24px rgba(109,40,217,0.1)"; });
                            parent.addEventListener("mouseleave", () => { el.style.borderColor = "rgba(109,40,217,0.1)"; el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.03)"; });
                          }
                        }}
                      >
                        {/* Preview area — simulated document lines */}
                        <div className="relative h-36 p-4 overflow-hidden" style={{ background: "var(--panel-bg)" }}>
                          {/* Fake content preview lines */}
                          <div className="flex flex-col gap-[6px]">
                            <div className="h-2.5 rounded-full w-3/5" style={{ background: "var(--border)" }} />
                            <div className="h-1.5 rounded-full w-full" style={{ background: "var(--hover)", opacity: 0.7 }} />
                            <div className="h-1.5 rounded-full w-4/5" style={{ background: "var(--hover)", opacity: 0.7 }} />
                            <div className="h-1.5 rounded-full w-full" style={{ background: "var(--hover)", opacity: 0.5 }} />
                            <div className="h-1.5 rounded-full w-2/3" style={{ background: "var(--hover)", opacity: 0.5 }} />
                            <div className="h-1.5 rounded-full w-full" style={{ background: "var(--hover)", opacity: 0.3 }} />
                            <div className="h-1.5 rounded-full w-3/4" style={{ background: "var(--hover)", opacity: 0.3 }} />
                            <div className="h-1.5 rounded-full w-1/2" style={{ background: "var(--hover)", opacity: 0.2 }} />
                          </div>
                          {/* Word count badge */}
                          {wordCount > 0 && (
                            <div className="absolute top-3 right-3 px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                              {wordCount.toLocaleString()} words
                            </div>
                          )}
                          {/* Delete */}
                          <button className="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                            style={{ background: "rgba(239,68,68,0.08)" }}
                            onClick={(e) => deleteProject(p.id, e)}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.15)")} onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                          </button>
                        </div>
                        {/* Footer */}
                        <div className="px-4 py-3 border-t" style={{ borderColor: "rgba(109,40,217,0.08)" }}>
                          <h3 className="text-[13px] font-semibold truncate mb-1" style={{ color: "var(--foreground)" }}>{p.name}</h3>
                          <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--muted)" }}>
                            <span>{formatDate(p.updatedAt)}</span>
                            {p.pdfs.length > 0 && (
                              <>
                                <span style={{ opacity: 0.3 }}>&middot;</span>
                                <span className="flex items-center gap-0.5">
                                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                  {p.pdfs.length} PDF{p.pdfs.length !== 1 ? "s" : ""}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {!projects && (
          <div className="max-w-3xl mx-auto px-6 py-10">
            <div className="skeleton w-32 h-6 rounded mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map((i) => <div key={i} className="skeleton rounded-2xl h-44" />)}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 py-6" style={{ opacity: 0.5 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)" }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>Your data stays in your browser</span>
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>&middot;</span>
          <Link href="/privacy" className="text-[10px] no-underline" style={{ color: "var(--purple)" }}>Privacy</Link>
        </div>
      </div>

      <WelcomeModal />

      {/* New Project Modal */}
      {showNewModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={() => setShowNewModal(false)}>
          <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", damping: 25 }}
            className="w-full max-w-sm mx-4 rounded-2xl p-6" style={{ background: "var(--panel-bg)", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1" style={{ color: "var(--foreground)" }}>New project</h3>
            <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>Give your research project a name</p>
            <input ref={nameInputRef} type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createProject(newProjectName); }}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none mb-5"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }} autoFocus />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNewModal(false)} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ color: "var(--muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>Cancel</button>
              <button onClick={() => createProject(newProjectName)} disabled={creating} className="px-5 py-2 rounded-lg text-xs font-semibold"
                style={{ background: "var(--purple)", color: "#fff" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--purple-soft)")} onMouseLeave={(e) => (e.currentTarget.style.background = "var(--purple)")}>Create</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
