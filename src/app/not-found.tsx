import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center h-screen"
      style={{ background: "var(--background)" }}
    >
      <div
        className="flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
        style={{ background: "var(--purple-bg)" }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--purple)" }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </div>
      <h1
        className="text-2xl font-bold tracking-tight mb-2"
        style={{ color: "var(--foreground)" }}
      >
        Page not found
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        The page you are looking for does not exist.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors no-underline"
        style={{ background: "var(--purple)", color: "#fff" }}
      >
        Back to Home
      </Link>
    </div>
  );
}
