"use client";

import { Info, LoaderCircle, Plus, Search, Sparkles, WandSparkles } from "lucide-react";
import type { ComposerDraft } from "@/lib/types";
import { DEPTH_OPTIONS } from "@/lib/format";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SystemOverviewModal } from "./SystemOverviewModal";

interface ResearchFormProps {
  composer: ComposerDraft;
  isSubmitting: boolean;
  onCompose: (composer: ComposerDraft) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ResearchForm({ composer, isSubmitting, onCompose, onSubmit }: ResearchFormProps) {
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <section className="glass-panel rounded-[30px] p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
            <WandSparkles className="h-5 w-5" />
            <span>Launch Research Engine</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => setIsOverviewOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all bg-[var(--surface-subtle)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-soft)]/5"
          >
            <Info className="h-3.5 w-3.5" />
            System Overview
          </motion.button>
        </div>

        <form className="space-y-8" onSubmit={onSubmit}>
          <div className="space-y-4">
            <label htmlFor="research-topic" className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] ml-1">
              Objective Definition
            </label>
            <div className="relative group">
              <textarea
                id="research-topic"
                value={composer.topic}
                onChange={(e) => onCompose({ ...composer, topic: e.target.value })}
                placeholder="What deep insights are you seeking today? Provide clear context for better synthesis..."
                className="min-h-[160px] w-full rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/30 px-6 py-6 text-base sm:text-lg leading-relaxed text-[var(--text-strong)] outline-none transition-all placeholder:text-[var(--text-muted)]/40 focus:border-[var(--accent-border)] focus:ring-8 focus:ring-[var(--accent-soft)]/5 group-hover:bg-[var(--surface-subtle)]/60"
              />
              <motion.div 
                initial={false}
                animate={{ opacity: composer.topic.trim().length > 0 ? 1 : 0.6 }}
                className="absolute right-6 bottom-6 text-[9px] font-bold uppercase tracking-tighter text-[var(--text-muted)] bg-[var(--surface-paper)]/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[var(--border-subtle)]"
              >
                {composer.topic.trim().length < 3 ? "Topic too brief" : "Optimizing Objective..."}
              </motion.div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Research Intensity</p>
              <p className="text-[9px] uppercase font-bold tracking-[0.2em] text-[var(--accent)] opacity-60">
                Strategic Choice = Knowledge Quality
              </p>
            </div>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              {DEPTH_OPTIONS.map((option, idx) => {
                const active = composer.depth === option.value;
                return (
                  <motion.button
                    key={option.value}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => onCompose({ ...composer, depth: option.value })}
                    className={`relative overflow-hidden rounded-[28px] border p-6 text-left transition-all duration-300 ${
                      active
                        ? "border-[var(--accent-border)] bg-[var(--surface-highlight)] shadow-xl ring-4 ring-[var(--accent-soft)]/10"
                        : "border-[var(--border-subtle)] bg-[var(--surface-subtle)]/30 hover:border-[var(--border-strong)]"
                    }`}
                  >
                    {active && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 0.05, scale: 1 }}
                        className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)] rounded-bl-full -mr-8 -mt-8" 
                      />
                    )}
                    <div className="mb-4 flex items-center justify-between">
                      <span className={`text-sm font-bold uppercase tracking-widest ${active ? "text-[var(--accent)]" : "text-[var(--text-strong)]"}`}>
                        {option.label}
                      </span>
                      <div className={`p-2 rounded-xl transition-colors ${active ? "bg-[var(--accent)]" : "bg-[var(--surface-subtle)]"}`}>
                        <Sparkles className={`h-4 w-4 ${active ? "text-white" : "text-[var(--text-muted)]"}`} />
                      </div>
                    </div>
                    <p className="mb-6 text-xs leading-6 text-[var(--text-muted)] h-[3rem] line-clamp-2 italic opacity-80">
                      &quot;{option.description}&quot;
                    </p>
                    <div className="flex items-center gap-4 pt-4 border-t border-[var(--border-subtle)]/50">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60">
                          Cycles
                        </span>
                        <span className="text-xs font-bold text-[var(--text-strong)]">{option.iterations}</span>
                      </div>
                      <div className="w-[1px] h-4 bg-[var(--border-subtle)]" />
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60">
                          Breadth
                        </span>
                        <span className="text-xs font-bold text-[var(--text-strong)]">{option.sections}</span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pt-8 border-t border-[var(--border-subtle)]/50">
            <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] font-medium">
              <div className="p-2.5 bg-[var(--accent-soft)] rounded-full text-[var(--accent)]">
                <Search className="h-4 w-4" />
              </div>
              <span className="opacity-80">Autonomous multi-step reasoning, source verification, and synthesis.</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting || composer.topic.trim().length < 3}
              className="w-full lg:w-auto min-h-[64px] inline-flex items-center justify-center gap-3 rounded-full bg-[var(--accent)] px-12 py-4 text-sm font-bold text-[var(--accent-foreground)] uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(139,74,40,0.2)] transition-all hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-40 disabled:translate-y-0 disabled:shadow-none"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                  <span>Initiating Core...</span>
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  <span>Execute Analysis</span>
                </>
              )}
            </motion.button>
          </div>
        </form>
      </section>

      <SystemOverviewModal 
        isOpen={isOverviewOpen} 
        onClose={() => setIsOverviewOpen(false)} 
      />
    </motion.div>
  );
}
