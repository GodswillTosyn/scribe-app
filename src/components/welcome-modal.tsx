"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem("scribe-welcomed")) setOpen(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem("scribe-welcomed", "true");
    setOpen(false);
  };

  if (!open) return null;

  const steps = [
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
      title: "Upload your research",
      desc: "Add PDFs to your project. Select any text to instantly cite it in APA format.",
      gradient: "linear-gradient(135deg, #7C3AED, #6D28D9)",
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
        </svg>
      ),
      title: "Ask AI anything",
      desc: "Summarize, explain, or ask questions. Scribe AI reads your PDFs and cites page numbers.",
      gradient: "linear-gradient(135deg, #7C3AED, #3B82F6)",
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      title: "Everything stays private",
      desc: "Your files live in your browser. Nothing is uploaded. Export to Word anytime to back up.",
      gradient: "linear-gradient(135deg, #6D28D9, #9333EA)",
    },
  ];

  const current = steps[step];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-[380px] mx-4 rounded-3xl overflow-hidden"
          style={{ background: "var(--panel-bg)", boxShadow: "0 32px 80px rgba(0,0,0,0.3)" }}
        >
          {/* Animated gradient header */}
          <motion.div
            key={step}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="relative h-48 flex items-center justify-center overflow-hidden"
            style={{ background: current.gradient }}
          >
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="absolute -bottom-16 -left-8 w-48 h-48 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
            <div className="absolute top-6 left-6 w-16 h-16 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />

            <motion.div
              key={`icon-${step}`}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", damping: 20 }}
              className="relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(12px)", color: "#fff" }}
            >
              {current.icon}
            </motion.div>
          </motion.div>

          {/* Content */}
          <div className="px-7 pt-6 pb-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-bold tracking-tight mb-2" style={{ color: "var(--foreground)" }}>
                  {current.title}
                </h2>
                <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--muted)" }}>
                  {current.desc}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mb-5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className="transition-all rounded-full"
                  style={{
                    width: i === step ? 24 : 8,
                    height: 8,
                    background: i === step ? "var(--purple)" : "var(--border)",
                  }}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {step < steps.length - 1 ? (
                <>
                  <button
                    onClick={dismiss}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    style={{ color: "var(--muted)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => setStep(step + 1)}
                    className="flex-[2] py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    style={{ background: "var(--purple)", color: "#fff" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--purple-soft)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "var(--purple)")}
                  >
                    Next
                  </button>
                </>
              ) : (
                <button
                  onClick={dismiss}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: "var(--purple)", color: "#fff", boxShadow: "0 4px 14px rgba(109,40,217,0.3)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--purple-soft)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--purple)")}
                >
                  Get Started
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
