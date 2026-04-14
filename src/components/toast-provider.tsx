"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 2500,
        style: {
          background: "var(--panel-bg)",
          color: "var(--foreground)",
          border: "1px solid var(--border)",
          fontSize: "12px",
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          padding: "8px 14px",
          borderRadius: "12px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
        },
        success: {
          iconTheme: { primary: "#6D28D9", secondary: "#fff" },
        },
      }}
    />
  );
}
