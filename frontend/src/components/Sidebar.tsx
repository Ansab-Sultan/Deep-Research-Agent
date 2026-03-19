"use client";
import React, { useState } from "react";
import { NotebookTabs, Plus, Search, Trash2, X } from "lucide-react";
import type { JobFilter, JobListItem } from "@/lib/types";
import { formatRelativeTime, statusLabel } from "@/lib/format";
import { ToneBadge } from "./ToneBadge";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarProps {
  jobsLoading: boolean;
  jobsError: string | null;
  selectedJobId: string | null;
  filter: JobFilter;
  visibleJobs: JobListItem[];
  onSelectJob: (jobId: string) => void;
  onDeleteJob: (jobId: string) => void;
  onSetFilter: (filter: JobFilter) => void;
  onNewResearch: () => void;
}

export function Sidebar({
  jobsLoading,
  jobsError,
  selectedJobId,
  filter,
  visibleJobs,
  onSelectJob,
  onDeleteJob,
  onSetFilter,
  onNewResearch,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVisibleJobs = visibleJobs.filter(job => 
    job.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <aside className="w-full h-full flex flex-col max-h-[calc(100vh-120px)] xl:max-h-none">
      <section className="glass-panel flex flex-1 flex-col rounded-[28px] xl:rounded-[36px] p-5 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]"
          >
            <NotebookTabs className="h-4 w-4 text-[var(--accent)]" />
            <span>Research Library</span>
          </motion.div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onNewResearch}
            className="p-2 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors shadow-sm"
            title="New Research"
          >
            <Plus className="h-4 w-4" />
          </motion.button>
        </div>

        {/* Search Bar */}
        <div className="mb-4 relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)] opacity-50 group-focus-within:text-[var(--accent)] group-focus-within:opacity-100 transition-all font-bold" />
          <input
            type="text"
            placeholder="Search trials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-xl py-2 pl-9 pr-8 text-xs text-[var(--text-strong)] placeholder:text-[var(--text-muted)] placeholder:opacity-50 focus:border-[var(--accent-border)] focus:bg-[var(--surface-paper)] transition-all outline-none font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-[var(--surface-highlight)] text-[var(--text-muted)] transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {(["all", "active", "completed", "failed"] as JobFilter[]).map((f) => (
            <motion.button
              key={f}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => onSetFilter(f)}
              className={`rounded-full border px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] transition-all ${
                filter === f
                  ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-strong)] shadow-inner"
                  : "border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
              }`}
            >
              {f}
            </motion.button>
          ))}
        </div>

        <motion.div 
          className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar min-h-0"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {jobsLoading ? (
            <div className="rounded-[22px] border border-dashed border-[var(--border-subtle)] px-4 py-12 text-sm text-[var(--text-muted)] text-center">
              <motion.div
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Summoning History...
              </motion.div>
            </div>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {filteredVisibleJobs.length > 0 ? (
                filteredVisibleJobs.map((job) => (
                  <motion.article
                    layout
                    key={job.job_id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, x: -20 }}
                    whileHover={{ scale: 1.02 }}
                    className={`rounded-[24px] border p-4 transition-shadow group cursor-pointer ${
                      selectedJobId === job.job_id
                        ? "border-[var(--accent-border)] bg-[var(--surface-highlight)] shadow-lg"
                        : "border-[var(--border-subtle)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)]"
                    }`}
                    onClick={() => onSelectJob(job.job_id)}
                  >
                    <div className="w-full text-left">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <ToneBadge label={statusLabel(job.status)} tone={job.status} />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] opacity-60">
                          {formatRelativeTime(job.created_at)}
                        </span>
                      </div>
                      <h2 className="mb-2 line-clamp-2 text-sm font-bold leading-5 text-[var(--text-strong)] group-hover:text-[var(--accent)] transition-colors">
                        {job.title || "Untitled research run"}
                      </h2>
                      <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-[0.15em] text-[var(--text-muted)] opacity-70">
                        <span>{job.depth ?? "standard"}</span>
                        <span className="text-[var(--border-strong)] opacity-30">/</span>
                        <span>{job.has_persisted_report ? "Archived" : "Transient"}</span>
                      </div>
                    </div>
                    {(job.status === "complete" || job.status === "failed") && (
                      <motion.button
                        layout
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteJob(job.job_id);
                        }}
                        className="mt-4 opacity-0 group-hover:opacity-100 focus:opacity-100 inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] transition-all hover:text-[var(--error)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete Run
                      </motion.button>
                    )}
                  </motion.article>
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-[24px] border border-dashed border-[var(--border-subtle)] px-4 py-12 text-sm text-[var(--text-muted)] text-center"
                >
                  <p className="opacity-40 uppercase tracking-widest font-bold text-[10px]">
                    {searchQuery ? "No matches found." : (jobsError ?? "No insights found.")}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </motion.div>
      </section>
    </aside>
  );
}
