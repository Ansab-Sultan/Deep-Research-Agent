import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FileText,
  LoaderCircle,
  ArrowUpRight,
  Sparkles,
  Network,
  ChevronDown,
  Database,
  X,
} from "lucide-react";
import type { ChunkRecord, JobStatus, ReportDetail, ReportSection } from "@/lib/types";
import { formatDateTime, statusLabel, truncate } from "@/lib/format";
import { ToneBadge } from "./ToneBadge";
import type { Components } from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import { getChunk } from "@/lib/api";

interface ReportViewerProps {
  selectedJob: {
    job_id: string;
    title: string | null;
    status: JobStatus;
    created_at: string | null;
    depth: string | null;
    error: string | null;
  } | null;
  report: ReportDetail | null;
  selectionLoading: boolean;
  selectionError: string | null;
  sectionLinks: ReportSection[];
  markdownComponents: Components;
  followupQuestion: string;
  isSubmittingFollowup: boolean;
  onSetFollowupQuestion: (question: string) => void;
  onFollowupSubmit: (e: React.FormEvent) => void;
  onHighlightEvidence: (chunkIds: string[]) => void;
}

type InlineEvidence = {
  chunks: ChunkRecord[];
  loading: boolean;
};

export function ReportViewer({
  selectedJob,
  report,
  selectionLoading,
  selectionError,
  sectionLinks,
  markdownComponents,
  followupQuestion,
  isSubmittingFollowup,
  onSetFollowupQuestion,
  onFollowupSubmit,
  onHighlightEvidence,
}: ReportViewerProps) {
  const [expandedFollowup, setExpandedFollowup] = useState<number | null>(null);
  const [evidenceCache, setEvidenceCache] = useState<Record<number, InlineEvidence>>({});

  const handleToggleEvidence = useCallback(
    async (followupIndex: number, chunkIds: string[]) => {
      if (expandedFollowup === followupIndex) {
        setExpandedFollowup(null);
        return;
      }

      setExpandedFollowup(followupIndex);
      onHighlightEvidence(chunkIds);

      if (evidenceCache[followupIndex]?.chunks.length) return;
      if (!selectedJob) return;

      setEvidenceCache((prev) => ({
        ...prev,
        [followupIndex]: { chunks: [], loading: true },
      }));

      try {
        const fetched = await Promise.all(
          chunkIds.map((id) => getChunk(selectedJob.job_id, id))
        );
        setEvidenceCache((prev) => ({
          ...prev,
          [followupIndex]: { chunks: fetched, loading: false },
        }));
      } catch (err) {
        console.error("Failed to load evidence chunks", err);
        setEvidenceCache((prev) => ({
          ...prev,
          [followupIndex]: { chunks: [], loading: false },
        }));
      }
    },
    [expandedFollowup, evidenceCache, selectedJob, onHighlightEvidence]
  );

  return (
    <AnimatePresence mode="wait">
      {!selectedJob ? (
        <motion.div 
          key="no-selection"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="flex flex-col items-center justify-center min-h-[500px] text-center p-8 h-full"
        >
          <div className="w-24 h-24 bg-[var(--surface-subtle)] rounded-[32px] flex items-center justify-center mb-8 text-[var(--text-muted)] opacity-40 shadow-inner">
            <FileText className="h-12 w-12" />
          </div>
          <h2 className="text-3xl font-[family:var(--font-display)] font-bold text-[var(--text-strong)] mb-4 tracking-tight">
            Ready for Synthesis?
          </h2>
          <p className="max-w-md text-sm text-[var(--text-muted)] leading-relaxed opacity-70">
            Select an existing research run from your library or initiate a new deep-dive to generate structured insights.
          </p>
        </motion.div>
      ) : selectionError ? (
        <motion.div 
          key="error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="rounded-[40px] border border-[var(--error-border)] bg-[var(--error-soft)] p-12 text-center shadow-2xl"
        >
          <h2 className="text-2xl font-bold text-[var(--error)] mb-3">Transmission Failed</h2>
          <p className="text-sm font-medium text-[var(--error)] opacity-80">{selectionError}</p>
        </motion.div>
      ) : selectionLoading ? (
        <motion.div 
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center min-h-[500px] text-center p-8"
        >
          <LoaderCircle className="h-12 w-12 animate-spin text-[var(--accent)] mb-6 opacity-80" />
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[var(--text-muted)] opacity-60">
            Decrypting Intelligence Data...
          </p>
        </motion.div>
      ) : (
        <motion.div 
          key={selectedJob.job_id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-8 pb-8"
        >
          <header className="border-b border-[var(--border-subtle)] pb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-8">
              <div className="space-y-5">
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]"
                >
                  <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                  <span>Synthesis Report Active</span>
                </motion.div>
                <div className="flex items-center gap-6 flex-wrap">
                  <h1 className="text-4xl sm:text-5xl font-[family:var(--font-display)] font-bold tracking-tight text-[var(--text-strong)] drop-shadow-sm">
                    {selectedJob.title || "Untitled Intelligence Run"}
                  </h1>
                  <ToneBadge label={statusLabel(selectedJob.status)} tone={selectedJob.status} />
                </div>
              </div>

              <div className="flex flex-col items-end gap-3">
                <div className="flex flex-col gap-1 text-right">
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-80">
                    Generated: {formatDateTime(selectedJob.created_at)}
                  </p>
                  <p className="text-[9px] font-bold text-[var(--text-muted)] opacity-40 uppercase tracking-widest">
                    X-REF: {selectedJob.job_id}
                  </p>
                </div>
                <motion.button
                  onClick={() => document.getElementById('interrogate-findings')?.scrollIntoView({ behavior: 'smooth' })}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-5 py-2 rounded-full border border-[var(--accent-strong)] bg-[var(--accent)] text-[9px] font-bold uppercase tracking-[0.15em] text-white transition-all hover:bg-[var(--accent-strong)] hover:shadow-lg shadow-[var(--accent-soft)]/30 flex items-center gap-2"
                >
                  <Sparkles className="h-3 w-3" />
                  Interrogate Findings
                </motion.button>
              </div>
            </div>

            <AnimatePresence>
              {sectionLinks.length > 0 && (
                <motion.nav 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex flex-wrap items-center gap-2.5 mt-6"
                >
                  {sectionLinks.map((section, idx) => (
                    <motion.button
                      key={section.id}
                      onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-5 py-2.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] transition-all hover:border-[var(--accent-border)] hover:bg-[var(--accent-soft)]/10 hover:text-[var(--accent)] shadow-sm"
                    >
                      {truncate(section.label, 30)}
                      <ArrowUpRight className="inline-block ml-2 h-3 w-3 opacity-30" />
                    </motion.button>
                  ))}
                </motion.nav>
              )}
            </AnimatePresence>
          </header>

          {report ? (
            <div className="relative space-y-12">
              <div className="relative">
                <AnimatePresence>
                  {sectionLinks.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                      className="sticky top-6 z-20 mb-8 hidden xxl:block"
                    >
                      <div className="absolute -left-[240px] w-[210px]">
                        <nav className="flex flex-col gap-1.5 p-5 rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-paper)]/80 backdrop-blur-xl shadow-2xl">
                          <p className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-[0.25em] mb-4 px-2 opacity-70">Knowledge Index</p>
                          {sectionLinks.map((section) => (
                            <button
                              key={section.id}
                              onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })}
                              className="text-left px-3 py-2.5 rounded-2xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]/5 transition-all line-clamp-1 border border-transparent hover:border-[var(--accent-border)]/20"
                            >
                              {section.label}
                            </button>
                          ))}
                          <button
                            onClick={() => document.getElementById('interrogate-findings')?.scrollIntoView({ behavior: 'smooth' })}
                            className="text-left px-3 py-2.5 rounded-2xl text-xs font-bold text-[var(--accent)] hover:bg-[var(--accent-soft)]/10 transition-all line-clamp-1 border border-transparent hover:border-[var(--accent-border)]/30 mt-2"
                          >
                            Interrogate Findings
                          </button>
                        </nav>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                  className="rounded-[48px] border border-[var(--border-subtle)] bg-[var(--surface-paper)] p-6 sm:p-10 lg:p-12 shadow-[0_48px_128px_-32px_rgba(31,21,16,0.12)]"
                >
                  <article className="report-markdown prose prose-stone max-w-none [&>*:first-child]:mt-0">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {report.report_markdown}
                    </ReactMarkdown>
                  </article>
                </motion.div>
              </div>

              {/* Follow-up / Interrogation Section */}
              <div className="max-w-4xl mx-auto w-full space-y-8 pt-8 border-t border-[var(--border-subtle)]/30">
                <div className="text-center space-y-2">
                  <h2 id="interrogate-findings" className="text-3xl font-[family:var(--font-display)] font-bold text-[var(--text-strong)] tracking-tight">
                    Interrogate Findings
                  </h2>
                  <p className="text-sm text-[var(--text-muted)] opacity-60">
                    Deepen your understanding by querying the synthesized intelligence or clarifying specific data points.
                  </p>
                </div>

                <div className="glass-panel rounded-[40px] p-6 lg:p-8 space-y-8 border border-[var(--border-subtle)]/50">
                  <form className="space-y-6" onSubmit={onFollowupSubmit}>
                    <div className="relative">
                      <textarea
                        value={followupQuestion}
                        onChange={(e) => onSetFollowupQuestion(e.target.value)}
                        disabled={isSubmittingFollowup}
                        placeholder="Type your follow-up interrogation prompt..."
                        className="w-full min-h-[140px] rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/30 p-8 text-base leading-relaxed text-[var(--text-strong)] outline-none transition placeholder:text-[var(--text-muted)]/40 focus:border-[var(--accent-border)] focus:ring-8 focus:ring-[var(--accent-soft)]/5 disabled:opacity-40"
                      />
                      <AnimatePresence>
                        {isSubmittingFollowup && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-[var(--surface-subtle)]/60 backdrop-blur-md rounded-[32px] flex flex-col items-center justify-center gap-4"
                          >
                            <LoaderCircle className="h-10 w-10 animate-spin text-[var(--accent)]" />
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--accent)] animate-pulse">Analyzing...</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isSubmittingFollowup || followupQuestion.trim().length < 3}
                      className="w-full h-16 inline-flex items-center justify-center gap-3 rounded-full bg-[var(--accent)] text-[12px] font-bold text-[var(--accent-foreground)] uppercase tracking-[0.25em] transition-all hover:bg-[var(--accent-strong)] shadow-xl shadow-[var(--accent-soft)]/20 disabled:opacity-40"
                    >
                      <Sparkles className="h-5 w-5" />
                      <span>Execute Deep Analysis</span>
                    </motion.button>
                  </form>

                  <div className="space-y-6">
                    <AnimatePresence>
                      {report?.followups?.length ? (
                        report.followups.slice().reverse().map((f, i) => {
                          const isExpanded = expandedFollowup === i;
                          const evidence = evidenceCache[i];

                          return (
                            <motion.div
                              key={`${f.asked_at}-${i}`}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/20 overflow-hidden"
                            >
                              {/* Followup Header & Answer */}
                              <div className="p-8 space-y-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-[0.2em] opacity-60">Query Result</span>
                                  <span className="text-[9px] font-bold text-[var(--text-muted)] opacity-40">{formatDateTime(f.asked_at)}</span>
                                </div>
                                <h3 className="text-lg font-bold text-[var(--text-strong)] leading-relaxed">{f.question}</h3>
                                <div className="text-sm leading-7 text-[var(--text-muted)] bg-[var(--surface-paper)]/50 p-6 rounded-2xl border border-[var(--border-subtle)]/40 italic">
                                  &quot;{f.answer}&quot;
                                </div>

                                {/* Evidence Toggle Button */}
                                {f.cited_chunk_ids.length > 0 && (
                                  <button 
                                    onClick={() => handleToggleEvidence(i, f.cited_chunk_ids)}
                                    className={`inline-flex items-center gap-2.5 text-[9px] font-bold uppercase tracking-widest transition-all duration-300 rounded-full px-4 py-2 ${
                                      isExpanded
                                        ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-soft)]/25"
                                        : "text-[var(--accent)] hover:bg-[var(--accent-soft)]/10 border border-[var(--accent-border)]/40 hover:border-[var(--accent-border)]"
                                    }`}
                                  >
                                    <Database className="h-3 w-3" />
                                    <span>
                                      {isExpanded ? "Hide Evidence" : `View ${f.cited_chunk_ids.length} Evidence Source${f.cited_chunk_ids.length > 1 ? "s" : ""}`}
                                    </span>
                                    <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                                  </button>
                                )}
                              </div>

                              {/* Inline Evidence Drawer */}
                              <AnimatePresence initial={false}>
                                {isExpanded && f.cited_chunk_ids.length > 0 && (
                                  <motion.div
                                    key="evidence-drawer"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                                    className="overflow-hidden"
                                  >
                                    <div className="border-t border-[var(--border-subtle)]/50 bg-[var(--surface-paper)]/40 backdrop-blur-sm">
                                      {/* Evidence Header */}
                                      <div className="flex items-center justify-between px-8 pt-5 pb-3">
                                        <div className="flex items-center gap-2.5">
                                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                                          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
                                            Cited Evidence • {f.cited_chunk_ids.length} Source{f.cited_chunk_ids.length > 1 ? "s" : ""}
                                          </span>
                                        </div>
                                        <button
                                          onClick={() => setExpandedFollowup(null)}
                                          className="p-1.5 rounded-xl hover:bg-[var(--surface-subtle)] transition-colors text-[var(--text-muted)] opacity-50 hover:opacity-100"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </div>

                                      {/* Evidence Content */}
                                      <div className="px-8 pb-6 space-y-3">
                                        {evidence?.loading ? (
                                          <div className="flex items-center justify-center gap-3 py-10">
                                            <LoaderCircle className="h-5 w-5 animate-spin text-[var(--accent)] opacity-60" />
                                            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)] opacity-50">
                                              Resolving evidence...
                                            </span>
                                          </div>
                                        ) : evidence?.chunks.length ? (
                                          evidence.chunks.map((chunk, cidx) => (
                                            <motion.div
                                              key={chunk.chunk_id}
                                              initial={{ opacity: 0, y: 8 }}
                                              animate={{ opacity: 1, y: 0 }}
                                              transition={{ delay: cidx * 0.06 }}
                                              className="group rounded-2xl border border-[var(--accent-border)]/20 bg-[var(--surface-raised)]/60 p-5 hover:border-[var(--accent-border)]/50 transition-all duration-300 hover:shadow-md"
                                            >
                                              <div className="flex items-start justify-between gap-4 mb-3">
                                                <div className="min-w-0 flex-1">
                                                  <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-[var(--accent)] opacity-60 mb-1">
                                                    Segment {String(cidx + 1).padStart(2, "0")}
                                                  </p>
                                                  <h4 className="text-sm font-bold text-[var(--text-strong)] leading-snug line-clamp-2">
                                                    {chunk.heading?.replace(/^#+\s*/, "") || "Untitled Evidence"}
                                                  </h4>
                                                </div>
                                                <ToneBadge label="Cited" tone="running" />
                                              </div>
                                              <div className="bg-[var(--surface-subtle)]/30 p-4 rounded-xl border border-[var(--border-subtle)]/20 text-xs leading-6 text-[var(--text-muted)] prose prose-sm prose-stone max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-sm [&_h4]:text-xs [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_strong]:text-[var(--text-strong)] [&_strong]:font-semibold [&_p]:text-xs [&_p]:leading-6 [&_p]:text-[var(--text-muted)] [&_ul]:pl-4 [&_ul]:space-y-1 [&_li]:text-xs [&_li]:text-[var(--text-muted)]">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                  {(chunk.text || "").replace(/^#{1,6}\s+.+\n?/, "").trim()}
                                                </ReactMarkdown>
                                              </div>
                                            </motion.div>
                                          ))
                                        ) : (
                                          <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] py-8 text-center opacity-40">
                                            <Database className="h-5 w-5 mx-auto mb-2 opacity-30" />
                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                              Unable to resolve evidence sources
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <motion.div 
              key="assembling"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-[48px] border-2 border-dashed border-[var(--border-subtle)] bg-[var(--surface-subtle)]/30 p-20 text-center"
            >
              <div className="max-w-md mx-auto space-y-6">
                <div className="relative w-16 h-16 mx-auto">
                  <LoaderCircle className={`absolute inset-0 h-16 w-16 ${selectedJob.status === "failed" ? "text-[var(--error)]" : "animate-spin text-[var(--accent)] opacity-60"}`} />
                  <div className="absolute inset-4 rounded-full bg-[var(--accent-soft)]/20 animate-pulse" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-[var(--text-strong)] tracking-tight">
                    {selectedJob.status === "failed" ? "Synthesis Terminated" : "Assembling Intelligence"}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--text-muted)] opacity-70">
                    {selectedJob.status === "failed"
                      ? selectedJob.error || "A terminal exception occurred during the reasoning phase. Review state logs for diagnostics."
                      : "The generative engine is multi-pass synthesizing gathered evidence into a coherent intelligence briefing."}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
