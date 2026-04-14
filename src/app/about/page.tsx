import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | Scribe",
  description: "Scribe is an AI-powered research environment for analyzing PDFs and drafting research notes.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium mb-8 no-underline transition-colors"
          style={{ color: "var(--muted)" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Home
        </Link>

        {/* Logo + title */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl"
            style={{ background: "var(--purple)", color: "#fff" }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--foreground)" }}
          >
            About Scribe
          </h1>
        </div>

        <p
          className="text-sm leading-relaxed mb-10"
          style={{ color: "var(--muted)" }}
        >
          Scribe is an AI-powered research environment that lets you analyze PDFs and
          draft research notes — all within your browser. It combines a PDF viewer, a
          rich-text editor, and AI-assisted tools into a single, privacy-first
          workspace.
        </p>

        {/* Features */}
        <h2
          className="text-base font-semibold mb-4"
          style={{ color: "var(--foreground)" }}
        >
          Key Features
        </h2>

        <div className="space-y-3 mb-10">
          {[
            {
              icon: (
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              ),
              extra: <polyline points="14 2 14 8 20 8" />,
              title: "PDF Viewer",
              desc: "Open, navigate, and annotate PDF documents directly in the app.",
            },
            {
              icon: (
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              ),
              title: "Rich-Text Editor",
              desc: "Draft notes with a paginated, Word-like editor featuring headings, lists, and formatting.",
            },
            {
              icon: (
                <>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </>
              ),
              title: "AI Chat & Summarization",
              desc: "Ask questions about your PDFs and get context-aware answers powered by Google Gemini.",
            },
            {
              icon: (
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              ),
              title: "Privacy-First",
              desc: "All data is stored locally in your browser. PDFs never leave your device.",
            },
            {
              icon: (
                <>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </>
              ),
              title: "Export to Word",
              desc: "Export your notes as .docx files — generated entirely in your browser.",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-4 rounded-xl"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                style={{ background: "var(--purple-bg)" }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: "var(--purple)" }}
                >
                  {f.icon}
                  {f.extra}
                </svg>
              </div>
              <div>
                <p
                  className="text-sm font-semibold mb-0.5"
                  style={{ color: "var(--foreground)" }}
                >
                  {f.title}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/"
          className="inline-flex px-5 py-2.5 rounded-xl text-sm font-semibold no-underline transition-colors"
          style={{ background: "var(--purple)", color: "#fff" }}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
