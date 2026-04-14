"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { Suspense } from "react";

function ImportHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const imported = useRef(false);

  useEffect(() => {
    if (imported.current) return;
    const data = searchParams.get("data");
    if (!data) {
      router.push("/");
      return;
    }

    imported.current = true;

    try {
      const json = JSON.parse(atob(data));
      const id = crypto.randomUUID();
      const now = Date.now();
      db.projects.add({
        id,
        name: json.name || "Imported Project",
        content: json.content || "",
        pdfs: [],
        activePdfId: "",
        citations: json.citations || [],
        chatHistory: [],
        versions: [],
        createdAt: now,
        updatedAt: now,
      }).then(() => {
        router.push(`/project/${id}`);
      });
    } catch {
      router.push("/");
    }
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-sm" style={{ color: "var(--muted)" }}>Importing project...</p>
    </div>
  );
}

export default function ImportPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><p className="text-sm" style={{ color: "var(--muted)" }}>Loading...</p></div>}>
      <ImportHandler />
    </Suspense>
  );
}
