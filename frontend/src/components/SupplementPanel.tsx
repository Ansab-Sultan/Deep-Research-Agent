"use client";

import { BookOpen, ChevronRight, Database, Network, Sparkles, LoaderCircle, LucideIcon } from "lucide-react";
import type { ChunkRecord, ReportDetail } from "@/lib/types";
import { formatDateTime, truncate } from "@/lib/format";
import { ToneBadge } from "./ToneBadge";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SupplementPanelProps {
  report: ReportDetail | null;
  chunks: ChunkRecord[];
  activeCitedChunkIds: string[];
  onSelectChunk: (chunkId: string) => void;
  onHighlightEvidence: (chunkIds: string[]) => void;
}

type Tab = "sources" | "chunks";

export function SupplementPanel({
  report,
  chunks,
  activeCitedChunkIds,
  onSelectChunk,
  onHighlightEvidence,
}: SupplementPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("sources");

  const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: "sources", label: "Sources", icon: BookOpen },
    { id: "chunks", label: "Evidence", icon: Database },
  ];

  const contentVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <section className="glass-panel flex flex-col h-[600px] xl:h-[calc(100vh-280px)] rounded-[28px] overflow-hidden shadow-xl border border-[var(--border-subtle)]">
      <nav className="flex items-center border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]/30">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative ${
              activeTab === tab.id
                ? "text-[var(--accent)]"
                : "text-[var(--text-muted)] opacity-60 hover:opacity-100"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-4 right-4 h-0.5 bg-[var(--accent)] rounded-full" 
              />
            )}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-[var(--surface-paper)]/25">
        <AnimatePresence mode="wait">


          {activeTab === "sources" && (
            <motion.div
              key="sources"
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-3"
            >
              {report?.sources?.length ? (
                report.sources.map((source, index) => (
                  <motion.div
                    key={`${source}-${index}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={source}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center justify-between gap-4 rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 transition-all hover:border-[var(--accent-border)] hover:bg-[var(--surface-highlight)] shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--accent)] mb-1">
                          Source Segment {String(index + 1).padStart(2, "0")}
                        </p>
                        <p className="truncate text-xs font-semibold text-[var(--text-strong)]">{source}</p>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center group-hover:bg-[var(--accent-soft)] transition-colors">
                        <ChevronRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--accent)]" />
                      </div>
                    </Link>
                  </motion.div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-[var(--border-subtle)] py-16 text-center opacity-40">
                  <BookOpen className="h-8 w-8 mx-auto mb-4 opacity-30" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Evidence Map Empty
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "chunks" && (
            <motion.div
              key="chunks"
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-4"
            >
              {chunks.length > 0 ? (
                chunks.map((chunk, idx) => {
                  const cited = activeCitedChunkIds.includes(chunk.chunk_id);
                  return (
                    <motion.button
                      key={chunk.chunk_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.01, x: 4 }}
                      type="button"
                      onClick={() => onSelectChunk(chunk.chunk_id)}
                      className={`w-full rounded-[24px] border p-6 text-left transition-all duration-300 shadow-sm ${
                        cited
                          ? "border-[var(--accent-border)] bg-[var(--surface-highlight)] ring-4 ring-[var(--accent-soft)]/10"
                          : "border-[var(--border-subtle)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)]"
                      }`}
                    >
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[var(--accent)] mb-1.5 opacity-80">
                            Segment ID: {chunk.chunk_id}
                          </p>
                          <h4 className="text-sm font-bold text-[var(--text-strong)] line-clamp-2 leading-6">
                            {chunk.heading || "Untitled Synthesis Evidence"}
                          </h4>
                        </div>
                        {cited && <ToneBadge label="Verified" tone="running" />}
                      </div>
                      <p className="text-xs leading-6 text-[var(--text-muted)] opacity-80 line-clamp-3 italic bg-[var(--surface-subtle)]/40 p-3 rounded-xl border border-[var(--border-subtle)]/30">
                        &quot;{truncate(chunk.text.replace(/\s+/g, " "), 220)}&quot;
                      </p>
                    </motion.button>
                  );
                })
              ) : (
                <div className="rounded-[24px] border border-dashed border-[var(--border-subtle)] py-16 text-center opacity-40">
                  <Database className="h-8 w-8 mx-auto mb-4 opacity-30" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Knowledge Base Empty
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
