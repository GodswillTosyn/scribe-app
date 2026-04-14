"use client";

export default function ProjectError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--foreground)" }}>
          Something went wrong
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
          {error.message}
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--purple)", color: "#fff" }}
          >
            Try Again
          </button>
          <a
            href="/"
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: "var(--hover)", color: "var(--foreground)" }}
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
