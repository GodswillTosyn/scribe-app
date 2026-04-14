"use client";

import { useState, useEffect } from "react";

const TIPS = [
  { id: "cite", label: "Cite", description: "Select text in the PDF and click Cite to insert a citation" },
  { id: "ai", label: "AI", description: "Use the Research AI tab to ask questions about your PDFs" },
  { id: "snap", label: "Snap", description: "Use the Snap button to capture PDF regions as images" },
];

export default function Onboarding() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const flag = localStorage.getItem("scribe-onboarded");
    if (flag === "true") {
      setDismissed(new Set(TIPS.map((t) => t.id)));
    } else {
      setShow(true);
    }
  }, []);

  const dismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      if (next.size >= TIPS.length) {
        localStorage.setItem("scribe-onboarded", "true");
      }
      return next;
    });
  };

  if (!show) return null;
  if (dismissed.size >= TIPS.length) return null;

  const remaining = TIPS.filter((t) => !dismissed.has(t.id));

  return (
    <div className="fixed bottom-16 right-4 z-[9998] flex flex-col gap-2">
      {remaining.map((tip) => (
        <button
          key={tip.id}
          onClick={() => dismiss(tip.id)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all"
          style={{
            background: "var(--panel-bg)",
            border: "1px solid var(--purple-border)",
            boxShadow: "0 4px 16px rgba(109,40,217,0.12)",
            animation: "onboarding-pulse 2s ease-in-out infinite",
          }}
        >
          <span className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 text-[10px] font-bold" style={{ background: "var(--purple)", color: "#fff" }}>
            {tip.label.charAt(0)}
          </span>
          <div>
            <div className="text-[11px] font-semibold" style={{ color: "var(--purple)" }}>{tip.label}</div>
            <div className="text-[10px]" style={{ color: "var(--muted)" }}>{tip.description}</div>
          </div>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ color: "var(--muted)", marginLeft: "4px", flexShrink: 0 }}>
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      ))}
    </div>
  );
}
