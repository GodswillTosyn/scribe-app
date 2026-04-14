"use client";

import { useState, useEffect } from "react";

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("scribe-welcomed")) {
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem("scribe-welcomed", "true");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden"
        style={{
          background: "var(--panel-bg)",
          border: "1px solid var(--border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header accent */}
        <div
          className="h-1.5 w-full"
          style={{ background: "linear-gradient(90deg, var(--purple), var(--purple-soft))" }}
        />

        <div className="px-8 pt-8 pb-6">
          {/* Logo */}
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
            <span
              className="text-lg font-bold tracking-tight"
              style={{ color: "var(--foreground)" }}
            >
              Welcome to Scribe
            </span>
          </div>

          {/* Privacy info */}
          <div
            className="rounded-xl p-4 mb-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-0.5"
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
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <p
                  className="text-sm font-semibold mb-1"
                  style={{ color: "var(--foreground)" }}
                >
                  Your files stay on your device
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                  Your files are stored locally in your browser&apos;s IndexedDB. They never
                  leave your device.
                </p>
              </div>
            </div>
          </div>

          {/* Backup tip */}
          <div
            className="rounded-xl p-4 mb-6"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-0.5"
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
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <div>
                <p
                  className="text-sm font-semibold mb-1"
                  style={{ color: "var(--foreground)" }}
                >
                  Back up your work
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                  Export to Word regularly to back up your work.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={dismiss}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{
              background: "var(--purple)",
              color: "#fff",
              boxShadow: "0 4px 14px rgba(109,40,217,0.25)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--purple-soft)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--purple)")
            }
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
