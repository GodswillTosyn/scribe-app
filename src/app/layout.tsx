import type { Metadata } from "next";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "./globals.css";
import ToastProvider from "@/components/toast-provider";

export const metadata: Metadata = {
  title: "Scribe | AI-Powered Research Environment",
  description:
    "Analyze PDFs and draft research notes with AI-powered context. Cite, summarize, and export — all in your browser.",
  openGraph: {
    title: "Scribe | AI-Powered Research Environment",
    description:
      "Analyze PDFs and draft research notes with AI-powered context. Cite, summarize, and export — all in your browser.",
    siteName: "Scribe",
  },
  twitter: {
    card: "summary",
    title: "Scribe | AI-Powered Research Environment",
    description:
      "Analyze PDFs and draft research notes with AI-powered context. Cite, summarize, and export — all in your browser.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="h-screen overflow-hidden">
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
