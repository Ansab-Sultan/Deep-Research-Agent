"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Brain, FileText, CheckCircle2 } from "lucide-react";

interface SystemOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: <Search className="h-5 w-5" />,
    title: "Discovery",
    desc: "Autonomous crawling of high-authority technical sources and web documentation.",
  },
  {
    icon: <Brain className="h-5 w-5" />,
    title: "Reasoning",
    desc: "Multi-pass analysis to extract core concepts and cross-reference gathered data.",
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Synthesis",
    desc: "Generative assembly of structured insights into a coherent intelligence briefing.",
  },
  {
    icon: <CheckCircle2 className="h-5 w-5" />,
    title: "Validation",
    desc: "Automated verification of citations and cross-checking for factual consistency.",
  },
];

export function SystemOverviewModal({ isOpen, onClose }: SystemOverviewModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md"
          />
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="w-full max-w-2xl glass-panel bg-[var(--surface-paper)]/90 p-8 sm:p-12 rounded-[48px] shadow-2xl pointer-events-auto border border-[var(--border-subtle)] relative overflow-hidden"
            >
              {/* Decorative background */}
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-[var(--accent)]/5 rounded-full blur-3xl -z-10" />
              
              <button 
                onClick={onClose}
                className="absolute top-8 right-8 p-2 rounded-full hover:bg-[var(--surface-subtle)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-strong)]"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="text-center mb-12">
                <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-[0.3em] mb-3">Operational Logic</p>
                <h2 className="text-3xl font-[family:var(--font-display)] font-bold text-[var(--text-strong)] tracking-tight">
                  Deep Research Engine
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {STEPS.map((step, idx) => (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.1 }}
                    className="flex gap-4 p-5 rounded-3xl bg-[var(--surface-subtle)]/40 hover:bg-[var(--surface-subtle)]/60 transition-colors border border-transparent hover:border-[var(--border-subtle)]"
                  >
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                      {step.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--text-strong)] mb-1">{step.title}</h4>
                      <p className="text-xs leading-relaxed text-[var(--text-muted)] opacity-80">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-12 pt-8 border-t border-[var(--border-subtle)]/50 text-center">
                <button
                  onClick={onClose}
                  className="px-10 py-3 rounded-2xl bg-[var(--text-strong)] text-white text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                >
                  Return to Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
