import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy | Scribe",
  description: "How Scribe handles your data — everything stays in your browser.",
};

export default function PrivacyPage() {
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

        <h1
          className="text-2xl font-bold tracking-tight mb-2"
          style={{ color: "var(--foreground)" }}
        >
          Privacy Policy
        </h1>
        <p className="text-sm mb-10" style={{ color: "var(--muted)" }}>
          Last updated: April 2026
        </p>

        <div className="space-y-8">
          <Section title="Local-first storage">
            All your projects, PDFs, notes, and citations are stored locally in your
            browser using IndexedDB. Your files never leave your device unless you
            explicitly export them.
          </Section>

          <Section title="PDF handling">
            PDF files you open in Scribe are read and rendered entirely within your
            browser. They are never uploaded to any external server.
          </Section>

          <Section title="AI-powered features">
            When you use AI features (chat, summarization, or citation assistance),
            only the relevant page text from your PDF is sent to the Google Gemini API
            for processing. Full PDF files are never transmitted — only the extracted
            text content of the pages you are working with.
          </Section>

          <Section title="No cookies, tracking, or analytics">
            Scribe does not use cookies, tracking pixels, or analytics services. There
            is no user account system and no data is collected about your usage.
          </Section>

          <Section title="Export">
            The export-to-Word functionality runs entirely in your browser. Your
            documents are generated client-side and downloaded directly to your device.
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2
        className="text-base font-semibold mb-2"
        style={{ color: "var(--foreground)" }}
      >
        {title}
      </h2>
      <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
        {children}
      </p>
    </div>
  );
}
