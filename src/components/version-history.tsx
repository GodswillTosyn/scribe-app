"use client";

import type { VersionSnapshot } from "@/lib/db";

interface VersionHistoryProps {
  versions: VersionSnapshot[];
  onRestore: (content: string) => void;
  onClose: () => void;
}

export default function VersionHistory({ versions, onRestore, onClose }: VersionHistoryProps) {
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="w-[400px] max-h-[70vh] rounded-2xl flex flex-col" style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", boxShadow: "0 16px 48px rgba(0,0,0,0.15)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Version History</span>
          <button onClick={onClose} className="flex items-center justify-center w-6 h-6 rounded transition-colors" style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {versions.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: "var(--muted)" }}>No versions saved yet. Versions are auto-saved every 30 seconds.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {[...versions].reverse().map((v) => (
                <div key={v.id} className="flex items-center justify-between px-3 py-2 rounded-lg transition-colors" style={{ background: "var(--surface)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface)")}>
                  <div>
                    <div className="text-[11px] font-medium" style={{ color: "var(--foreground)" }}>{formatTime(v.timestamp)}</div>
                    <div className="text-[10px]" style={{ color: "var(--muted)" }}>{v.content.length.toLocaleString()} chars</div>
                  </div>
                  <button onClick={() => onRestore(v.content)} className="px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors"
                    style={{ background: "var(--purple-bg)", color: "var(--purple)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--purple-hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "var(--purple-bg)")}>
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
