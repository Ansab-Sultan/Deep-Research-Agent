"use client";

import { Radio, ChevronDown } from "lucide-react";
import type { JobStatus, ProgressEvent } from "@/lib/types";
import { formatDateTime, formatNodeLabel, PIPELINE_STEPS } from "@/lib/format";
import { ToneBadge } from "./ToneBadge";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface ProgressRailProps {
  selectedJob: {
    job_id: string;
    title: string | null;
    status: JobStatus;
  } | null;
  progressEvents: ProgressEvent[];
  streamState: "idle" | "connecting" | "open" | "closed";
}

export function ProgressRail({ selectedJob, progressEvents, streamState }: ProgressRailProps) {
  const currentStatus = selectedJob?.status ?? "queued";
  const isFinished = currentStatus === "complete" || currentStatus === "failed";
  const [expanded, setExpanded] = useState(!isFinished);

  return (
    <section className="space-y-4">
      <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]"
      >
        <Radio className={`h-3.5 w-3.5 ${streamState === "open" ? "animate-pulse" : "opacity-40"}`} />
        <span>Live Analysis Feed</span>
      </motion.div>

      <motion.div 
        layout
        className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/50 p-6 space-y-4 shadow-sm"
      >
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-bold text-[var(--text-strong)] line-clamp-1 tracking-tight">
            {selectedJob ? (selectedJob.title || "Active Intelligence Run") : "System Idle"}
          </p>
          <div className="flex items-center gap-2">
            <AnimatePresence mode="wait">
              {selectedJob && (
                <motion.div
                  key={currentStatus}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <ToneBadge label={currentStatus} tone={currentStatus} />
                </motion.div>
              )}
            </AnimatePresence>
            {isFinished && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="p-1.5 rounded-xl hover:bg-[var(--surface-subtle)] transition-colors text-[var(--text-muted)]"
                aria-label={expanded ? "Collapse pipeline" : "Expand pipeline"}
              >
                <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${expanded ? "" : "-rotate-90"}`} />
              </button>
            )}
          </div>
        </div>
        <p className="text-[11px] font-semibold text-[var(--text-muted)] mt-1 opacity-70">
          {streamState === "open"
            ? "Syncing encrypted telemetry from research nodes."
            : streamState === "connecting"
              ? "Establishing secure uplink..."
              : selectedJob
                ? "Mission parameters completed."
                : "Awaiting research objective selection."}
        </p>
      </motion.div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="pipeline-steps"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="relative space-y-5 pl-4 before:absolute before:left-[19px] before:top-3 before:bottom-3 before:w-[2px] before:bg-[var(--border-subtle)]/40 before:rounded-full">
              {PIPELINE_STEPS.map((step, idx) => {
                const stepEvents = progressEvents.filter((event) => event.node === step.node);
                const lastEvent = stepEvents[stepEvents.length - 1];
                const activeNode = progressEvents[progressEvents.length - 1]?.node;
                
                const isComplete = lastEvent || currentStatus === "complete";
                const isRunning = activeNode === step.node && currentStatus !== "complete" && currentStatus !== "failed";
                const isFailed = activeNode === step.node && currentStatus === "failed";
                
                let tone: string = "queued";
                if (isComplete) tone = "complete";
                if (isRunning) tone = "running";
                if (isFailed) tone = "failed";

                return (
                  <motion.div 
                    key={step.node} 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="relative group pl-10"
                  >
                    <motion.div 
                      animate={{ 
                        scale: tone === "running" ? [1, 1.2, 1] : 1,
                        backgroundColor: tone === "complete" ? "var(--success)" : 
                                         tone === "running" ? "var(--warning)" : 
                                         tone === "failed" ? "var(--error)" : "var(--border-strong)"
                      }}
                      transition={{ duration: 1, repeat: tone === "running" ? Infinity : 0 }}
                      className={`absolute left-[-4px] top-2.5 w-[10px] h-[10px] rounded-full border-2 border-[var(--background)] z-10 shadow-sm`} 
                    />
                    
                    <div className={`rounded-[24px] border p-5 transition-all duration-500 shadow-sm ${
                      tone === "running" ? "border-[var(--accent-border)] bg-[var(--surface-highlight)] scale-[1.02] shadow-lg" :
                      tone === "complete" ? "border-[var(--border-subtle)] bg-[var(--surface-subtle)]/30 opacity-90" :
                      "border-[var(--border-subtle)] bg-[var(--surface-subtle)]/10 opacity-30 scale-[0.98]"
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className={`text-[10px] font-bold uppercase tracking-[0.15em] ${
                          tone === "running" ? "text-[var(--accent)]" : "text-[var(--text-strong)]"
                        }`}>
                          {step.label}
                        </h4>
                        {tone !== "queued" && (
                          <span className="text-[8px] font-bold text-[var(--accent)] opacity-40 uppercase tracking-tighter">
                            {formatNodeLabel(step.node)}
                          </span >
                        )}
                      </div>
                      
                      <p className="text-[11px] leading-relaxed text-[var(--text-muted)] font-medium">
                        {lastEvent?.progress || step.detail}
                      </p>
                      
                      <AnimatePresence>
                        {lastEvent && (
                          <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-3 text-[8px] font-bold text-[var(--text-muted)] opacity-30 uppercase tracking-[0.2em]"
                          >
                            TS: {formatDateTime(lastEvent.ts)}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
