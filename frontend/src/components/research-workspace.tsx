"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useReducer,
  useState,
} from "react";
import {
  MoonStar,
  Radio,
  Sparkles,
  SunMedium,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import {
  FrontendApiError,
  buildStreamUrl,
  deleteJob,
  getChunk,
  getChunks,
  getHealth,
  getJobDetail,
  getReportDetail,
  listJobs,
  submitFollowup,
  submitResearch,
} from "@/lib/api";
import {
  filterJobs,
  slugifyHeading,
  extractReportSections,
} from "@/lib/format";
import type {
  ChunkRecord,
  ComposerDraft,
  FollowUpRecord,
  HealthResponse,
  JobDetailResponse,
  JobFilter,
  JobListItem,
  JobStatus,
  ProgressEvent,
  ReportDetail,
} from "@/lib/types";

// Sub-components
import { Sidebar } from "./Sidebar";
import { ResearchForm } from "./ResearchForm";
import { ReportViewer } from "./ReportViewer";
import { ProgressRail } from "./ProgressRail";
import { SupplementPanel } from "./SupplementPanel";
import { ToneBadge } from "./ToneBadge";
import { ConfirmModal } from "./ConfirmModal";
import type { Components } from "react-markdown";

type WorkspaceState = {
  jobs: JobListItem[];
  jobsLoading: boolean;
  jobsError: string | null;
  health: HealthResponse | null;
  healthError: string | null;
  selectedJobId: string | null;
  selectedJob: JobDetailResponse | null;
  selectionLoading: boolean;
  selectionError: string | null;
  report: ReportDetail | null;
  chunks: ChunkRecord[];
  progressEvents: ProgressEvent[];
  filter: JobFilter;
  activeCitedChunkIds: string[];
  streamState: "idle" | "connecting" | "open" | "closed";
  isSubmittingResearch: boolean;
  isSubmittingFollowup: boolean;
};

type WorkspaceAction =
  | { type: "jobs/loading" }
  | { type: "jobs/loaded"; jobs: JobListItem[] }
  | { type: "jobs/error"; message: string }
  | { type: "health/loaded"; health: HealthResponse }
  | { type: "health/error"; message: string }
  | { type: "select"; jobId: string | null }
  | { type: "selection/loading" }
  | { type: "selection/loaded"; detail: JobDetailResponse }
  | { type: "selection/error"; message: string }
  | { type: "report/loaded"; report: ReportDetail }
  | { type: "chunks/loaded"; chunks: ChunkRecord[] }
  | { type: "progress/append"; event: ProgressEvent }
  | { type: "stream/state"; value: WorkspaceState["streamState"] }
  | { type: "status/update"; status: JobStatus; error?: string | null }
  | { type: "filter/set"; filter: JobFilter }
  | { type: "cited/set"; chunkIds: string[] }
  | { type: "research/submitting"; value: boolean }
  | { type: "followup/submitting"; value: boolean }
  | { type: "job/upsert"; job: JobListItem }
  | { type: "job/remove"; jobId: string }
  | { type: "followup/append"; record: FollowUpRecord };

const THEME_STORAGE_KEY = "deep-research-theme";

function sortJobsDescending(jobs: JobListItem[]): JobListItem[] {
  return [...jobs].sort((left, right) => {
    const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
    const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
    return rightTime - leftTime;
  });
}

function createInitialState(initialJobId?: string): WorkspaceState {
  return {
    jobs: [],
    jobsLoading: true,
    jobsError: null,
    health: null,
    healthError: null,
    selectedJobId: initialJobId ?? null,
    selectedJob: null,
    selectionLoading: false,
    selectionError: null,
    report: null,
    chunks: [],
    progressEvents: [],
    filter: "all",
    activeCitedChunkIds: [],
    streamState: "idle",
    isSubmittingResearch: false,
    isSubmittingFollowup: false,
  };
}

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  if (action.type === "jobs/loading") {
    return { ...state, jobsLoading: true, jobsError: null };
  }

  if (action.type === "jobs/loaded") {
    return { ...state, jobsLoading: false, jobsError: null, jobs: sortJobsDescending(action.jobs) };
  }

  if (action.type === "jobs/error") {
    return { ...state, jobsLoading: false, jobsError: action.message };
  }

  if (action.type === "health/loaded") {
    return { ...state, health: action.health, healthError: null };
  }

  if (action.type === "health/error") {
    return { ...state, healthError: action.message };
  }

  if (action.type === "select") {
    return {
      ...state,
      selectedJobId: action.jobId,
      selectedJob: null,
      selectionLoading: Boolean(action.jobId),
      selectionError: null,
      report: null,
      chunks: [],
      progressEvents: [],
      activeCitedChunkIds: [],
      streamState: "idle",
    };
  }

  if (action.type === "selection/loading") {
    return { ...state, selectionLoading: true, selectionError: null };
  }

  if (action.type === "selection/loaded") {
    return {
      ...state,
      selectionLoading: false,
      selectionError: null,
      selectedJob: action.detail,
    };
  }

  if (action.type === "selection/error") {
    return {
      ...state,
      selectionLoading: false,
      selectionError: action.message,
    };
  }

  if (action.type === "report/loaded") {
    return {
      ...state,
      report: action.report,
      activeCitedChunkIds:
        action.report.followups.length > 0
          ? action.report.followups[action.report.followups.length - 1].cited_chunk_ids
          : state.activeCitedChunkIds,
    };
  }

  if (action.type === "chunks/loaded") {
    return { ...state, chunks: action.chunks };
  }

  if (action.type === "progress/append") {
    const last = state.progressEvents[state.progressEvents.length - 1];
    if (last && last.ts === action.event.ts && last.progress === action.event.progress) {
      return state;
    }

    return { ...state, progressEvents: [...state.progressEvents, action.event] };
  }

  if (action.type === "stream/state") {
    return { ...state, streamState: action.value };
  }

  if (action.type === "status/update") {
    if (!state.selectedJob) {
      return state;
    }

    return {
      ...state,
      selectedJob: {
        ...state.selectedJob,
        status: action.status,
        error: action.error ?? state.selectedJob.error,
      },
    };
  }

  if (action.type === "filter/set") {
    return { ...state, filter: action.filter };
  }

  if (action.type === "cited/set") {
    return { ...state, activeCitedChunkIds: action.chunkIds };
  }

  if (action.type === "research/submitting") {
    return { ...state, isSubmittingResearch: action.value };
  }

  if (action.type === "followup/submitting") {
    return { ...state, isSubmittingFollowup: action.value };
  }

  if (action.type === "job/upsert") {
    const withoutExisting = state.jobs.filter((job) => job.job_id !== action.job.job_id);
    return {
      ...state,
      jobs: sortJobsDescending([action.job, ...withoutExisting]),
      selectedJob:
        state.selectedJob?.job_id === action.job.job_id
          ? {
              ...state.selectedJob,
              ...action.job,
            }
          : state.selectedJob,
    };
  }

  if (action.type === "job/remove") {
    return {
      ...state,
      jobs: state.jobs.filter((job) => job.job_id !== action.jobId),
    };
  }

  if (action.type === "followup/append") {
    return {
      ...state,
      report: state.report
        ? {
            ...state.report,
            followups: [...state.report.followups, action.record],
          }
        : state.report,
      activeCitedChunkIds: action.record.cited_chunk_ids,
    };
  }

  return state;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof FrontendApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

function useThemeController() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "light" || stored === "dark") {
        return;
      }

      document.documentElement.dataset.theme = event.matches ? "dark" : "light";
    };

    media.addEventListener("change", handleSystemThemeChange);
    return () => media.removeEventListener("change", handleSystemThemeChange);
  }, []);

  return {
    toggleTheme() {
      const currentTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = nextTheme;
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    },
  };
}

const markdownComponents: Components = {
  h1(props) {
    const text = String(props.children);
    return (
      <h1 id={slugifyHeading(text)} className="font-[family:var(--font-display)] text-4xl font-bold tracking-tight text-[var(--text-strong)] first:mt-0 mt-8 mb-6">
        {props.children}
      </h1>
    );
  },
  h2(props) {
    const text = String(props.children);
    return (
      <h2 id={slugifyHeading(text)} className="font-[family:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--text-strong)] mt-10 mb-4">
        {props.children}
      </h2>
    );
  },
  h3(props) {
    const text = String(props.children);
    return (
      <h3 id={slugifyHeading(text)} className="font-[family:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--text-strong)] mt-8 mb-4">
        {props.children}
      </h3>
    );
  },
  a(props) {
    return (
      <a
        {...props}
        className="font-bold text-[var(--accent)] underline decoration-[var(--accent-border)] underline-offset-4 transition-colors hover:text-[var(--accent-strong)]"
        target="_blank"
        rel="noreferrer"
      />
    );
  },
  code(props) {
    if (props.className?.includes("language-")) {
      return (
        <code {...props} className="block overflow-x-auto rounded-2xl bg-[var(--surface-subtle)] px-6 py-4 text-sm font-mono text-[var(--text-strong)] border border-[var(--border-subtle)]" />
      );
    }
    return (
      <code {...props} className="rounded-md bg-[var(--surface-subtle)] px-2 py-0.5 text-[0.9em] font-mono font-bold text-[var(--accent)]" />
    );
  },
};

export function ResearchWorkspace({ initialJobId }: { initialJobId?: string }) {
  const router = useRouter();
  const { toggleTheme } = useThemeController();
  const [state, dispatch] = useReducer(workspaceReducer, initialJobId, createInitialState);
  const [composer, setComposer] = useState<ComposerDraft>({ topic: "", depth: "standard" });
  const [followupQuestion, setFollowupQuestion] = useState("");
  const [isHomeView, setIsHomeView] = useState(!initialJobId);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; jobId: string | null }>({
    isOpen: false,
    jobId: null,
  });

  const visibleJobs = filterJobs(state.jobs, state.filter);
  const extractedSections = state.report ? extractReportSections(state.report.report_markdown) : [];

  const refreshJobs = useEffectEvent(async (mode: "initial" | "silent" = "silent") => {
    if (mode === "initial") dispatch({ type: "jobs/loading" });
    try {
      const jobs = await listJobs();
      dispatch({ type: "jobs/loaded", jobs });
    } catch (error) {
      dispatch({ type: "jobs/error", message: getErrorMessage(error) });
    }
  });

  const refreshHealth = async () => {
    try {
      const h = await getHealth();
      dispatch({ type: "health/loaded", health: h });
    } catch (error) {
      dispatch({ type: "health/error", message: getErrorMessage(error) });
    }
  };

  const hydrateSelection = useEffectEvent(async (jobId: string, silent = false) => {
    if (!silent) dispatch({ type: "selection/loading" });
    try {
      const detail = await getJobDetail(jobId);
      dispatch({ type: "selection/loaded", detail });
      dispatch({ type: "job/upsert", job: detail });

      if (detail.status === "complete" || detail.has_persisted_report) {
        const report = await getReportDetail(jobId);
        dispatch({ type: "report/loaded", report });
        dispatch({ type: "stream/state", value: "closed" });
        // Fetch chunks independently so a Qdrant failure doesn't block the report.
        getChunks(jobId)
          .then((chunks) => dispatch({ type: "chunks/loaded", chunks }))
          .catch((err) => console.warn("chunks load failed", err));
      }
    } catch (error) {
      if (error instanceof FrontendApiError && error.status === 404) {
        dispatch({ type: "select", jobId: null });
        router.replace("/");
      } else {
        dispatch({ type: "selection/error", message: getErrorMessage(error) });
      }
    }
  });

  useEffect(() => {
    refreshJobs("initial");
    refreshHealth();
    const interval = setInterval(() => {
      refreshJobs("silent");
      refreshHealth();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (initialJobId) {
      dispatch({ type: "select", jobId: initialJobId });
      setIsHomeView(false);
    } else {
      setIsHomeView(true);
    }
  }, [initialJobId]);

  useEffect(() => {
    if (!state.selectedJobId) return;
    
    // Smooth transition: if we already have the job in our list, use silent hydration
    // to avoid a jarring full-area loader flash.
    const isCached = state.jobs.some(j => j.job_id === state.selectedJobId);
    hydrateSelection(state.selectedJobId, isCached);
  }, [state.selectedJobId, state.jobs.length]);

  useEffect(() => {
    if (!state.selectedJobId || !state.selectedJob) return;
    if (state.selectedJob.status !== "queued" && state.selectedJob.status !== "running") return;

    const stream = new EventSource(buildStreamUrl(state.selectedJobId));
    dispatch({ type: "stream/state", value: "connecting" });

    stream.addEventListener("progress", (e) => {
      dispatch({ type: "progress/append", event: JSON.parse(e.data) });
      dispatch({ type: "status/update", status: "running" });
      dispatch({ type: "stream/state", value: "open" });
    });

    stream.addEventListener("complete", async (e) => {
      dispatch({ type: "status/update", status: "complete" });
      dispatch({ type: "stream/state", value: "closed" });
      await refreshJobs("silent");
      hydrateSelection(JSON.parse(e.data).job_id, true);
      stream.close();
    });

    stream.addEventListener("error", async (e) => {
      if (e instanceof MessageEvent && e.data) {
        const err = JSON.parse(e.data);
        dispatch({ type: "status/update", status: "failed", error: err.message });
      }
      stream.close();
    });

    return () => stream.close();
  }, [state.selectedJob, state.selectedJobId]);

  const handleResearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (composer.topic.trim().length < 3) return;
    dispatch({ type: "research/submitting", value: true });
    try {
      const created = await submitResearch(composer);
      dispatch({ type: "job/upsert", job: { ...created, title: composer.topic, depth: composer.depth, created_at: new Date().toISOString(), has_persisted_report: false, report_id: null, error: null } });
      dispatch({ type: "select", jobId: created.job_id });
      setIsHomeView(false);
      router.push(`/jobs/${created.job_id}`);
      setComposer({ topic: "", depth: "standard" });
    } catch (error) {
      dispatch({ type: "selection/error", message: getErrorMessage(error) });
    } finally {
      dispatch({ type: "research/submitting", value: false });
    }
  };

  const handleFollowupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.selectedJobId || followupQuestion.trim().length < 3) return;
    dispatch({ type: "followup/submitting", value: true });
    try {
      const resp = await submitFollowup(state.selectedJobId, followupQuestion.trim());
      dispatch({
        type: "followup/append",
        record: {
          question: followupQuestion.trim(),
          answer: resp.answer,
          cited_chunk_ids: resp.cited_chunk_ids,
          asked_at: new Date().toISOString(),
        },
      });
      setFollowupQuestion("");
    } catch (error) {
      dispatch({ type: "selection/error", message: getErrorMessage(error) });
    } finally {
      dispatch({ type: "followup/submitting", value: false });
    }
  };

  const handleDelete = (jobId: string) => {
    setDeleteModal({ isOpen: true, jobId });
  };

  const confirmDelete = async () => {
    if (!deleteModal.jobId) return;
    const jobId = deleteModal.jobId;
    setDeleteModal({ isOpen: false, jobId: null });
    
    try {
      await deleteJob(jobId);
      dispatch({ type: "job/remove", jobId });
      if (state.selectedJobId === jobId) {
        dispatch({ type: "select", jobId: null });
        setIsHomeView(true);
        router.replace("/");
      }
    } catch (error) {
       dispatch({ type: "selection/error", message: getErrorMessage(error) });
    }
  };

  return (
    <main className="h-screen overflow-hidden bg-[var(--background)] text-[var(--text)] selection:bg-[var(--accent-soft)] flex flex-col">
      {/* Infrastructure Health Banner Removed */}

      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,_var(--hero-glow),_transparent_40%)] opacity-30" />
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(180deg,var(--hero-top),transparent)]" />
      
      <div className="mx-auto max-w-[1800px] h-screen flex flex-col xl:flex-row gap-6 p-4 md:p-6 lg:p-8 overflow-hidden">
        
        {/* Mobile Sidebar Toggle Overlay */}
        {mobileSidebarOpen && (
          <div 
            className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm xl:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        <div className={`
          fixed inset-y-0 left-0 z-[120] w-[320px] transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) xl:relative xl:transform-none xl:z-0 xl:w-85 h-full
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"}
        `}>
          <Sidebar
            jobsLoading={state.jobsLoading}
            jobsError={state.jobsError}
            selectedJobId={state.selectedJobId}
            filter={state.filter}
            visibleJobs={visibleJobs}
            onSelectJob={(id) => {
               dispatch({ type: "select", jobId: id });
               setIsHomeView(false);
               setMobileSidebarOpen(false);
               window.history.pushState(null, '', `/jobs/${id}`);
            }}
            onDeleteJob={handleDelete}
            onSetFilter={(f) => dispatch({ type: "filter/set", filter: f })}
            onNewResearch={() => {
              dispatch({ type: "select", jobId: null });
              setIsHomeView(true);
              setMobileSidebarOpen(false);
              window.history.pushState(null, '', `/`);
            }}
          />
        </div>

        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <header className="glass-panel flex items-center justify-between px-4 sm:px-6 py-4 rounded-[30px] shadow-sm">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setMobileSidebarOpen(true)}
                className="xl:hidden p-2 -ml-2 rounded-xl hover:bg-[var(--surface-subtle)] transition-colors"
              >
                <div className="w-5 h-0.5 bg-[var(--text-muted)] mb-1" />
                <div className="w-5 h-0.5 bg-[var(--text-muted)] mb-1" />
                <div className="w-5 h-0.5 bg-[var(--text-muted)]" />
              </button>
              <div className="hidden sm:flex w-10 h-10 rounded-2xl bg-[var(--accent)] items-center justify-center shadow-lg shadow-[var(--accent-soft)]">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--text-strong)] truncate max-w-[150px] sm:max-w-none">
                  Deep Research Workspace
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-4">

              <button
                onClick={toggleTheme}
                className="w-10 h-10 flex items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-paper)] text-[var(--text-muted)] hover:border-[var(--accent-border)] hover:text-[var(--accent)] transition-all"
              >
                <SunMedium className="h-5 w-5 block dark:hidden" />
                <MoonStar className="h-5 w-5 hidden dark:block" />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {isHomeView ? (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full overflow-y-auto custom-scrollbar pr-2"
                >
                  <ResearchForm
                    composer={composer}
                    isSubmitting={state.isSubmittingResearch}
                    onCompose={setComposer}
                    onSubmit={handleResearchSubmit}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={state.selectedJobId || "job"}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 h-full">
                    <div className="overflow-y-auto pr-2 custom-scrollbar h-[calc(100vh-180px)]">
                      <ReportViewer
                        selectedJob={state.selectedJob}
                        report={state.report}
                        selectionLoading={state.selectionLoading}
                        selectionError={state.selectionError}
                        sectionLinks={extractedSections}
                        markdownComponents={markdownComponents}
                        followupQuestion={followupQuestion}
                        isSubmittingFollowup={state.isSubmittingFollowup}
                        onSetFollowupQuestion={setFollowupQuestion}
                        onFollowupSubmit={handleFollowupSubmit}
                        onHighlightEvidence={async (ids) => {
                          dispatch({ type: "cited/set", chunkIds: ids });
                          if (ids.length > 0 && state.selectedJobId) {
                            try {
                              const fetched = await Promise.all(ids.map(id => getChunk(state.selectedJobId!, id)));
                              dispatch({ type: "chunks/loaded", chunks: fetched });
                            } catch (error) {
                              console.error(error);
                            }
                          }
                        }}
                      />
                    </div>
                    
                    <div className="flex flex-col gap-6 h-[calc(100vh-180px)] overflow-y-auto pr-2 custom-scrollbar">
                      <ProgressRail
                        selectedJob={state.selectedJob}
                        progressEvents={state.progressEvents}
                        streamState={state.streamState}
                      />
                      <SupplementPanel
                        report={state.report}
                        chunks={state.chunks}
                        activeCitedChunkIds={state.activeCitedChunkIds}
                        onSelectChunk={(id) => dispatch({ type: "cited/set", chunkIds: [id] })}
                        onHighlightEvidence={async (ids) => {
                          dispatch({ type: "cited/set", chunkIds: ids });
                          if (ids.length > 0 && state.selectedJobId) {
                            try {
                              const fetched = await Promise.all(ids.map(id => getChunk(state.selectedJobId!, id)));
                              dispatch({ type: "chunks/loaded", chunks: fetched });
                            } catch (error) {
                              console.error(error);
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Research?"
        message="This will permanently remove this synthesis run and all its associated intelligence data. This action cannot be undone."
        confirmLabel="Destroy Data"
        cancelLabel="Keep It"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, jobId: null })}
      />
    </main>
  );
}
