"use client";

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FrontendApiError,
  listJobs,
  getHealth,
  getJobDetail,
  getReportDetail,
  getChunk,
} from "@/lib/api";
import type {
  JobListItem,
  HealthResponse,
  JobDetailResponse,
  ReportDetail,
  ChunkRecord,
  ProgressEvent,
  JobFilter,
  JobStatus,
  FollowUpRecord,
} from "@/lib/types";

export type WorkspaceState = {
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

export type WorkspaceAction =
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

const initialState: WorkspaceState = {
  jobs: [],
  jobsLoading: true,
  jobsError: null,
  health: null,
  healthError: null,
  selectedJobId: null,
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

function sortJobsDescending(jobs: JobListItem[]): JobListItem[] {
  return [...jobs].sort((left, right) => {
    const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
    const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
    return rightTime - leftTime;
  });
}

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "jobs/loading":
      return { ...state, jobsLoading: true, jobsError: null };
    case "jobs/loaded":
      return { ...state, jobsLoading: false, jobsError: null, jobs: sortJobsDescending(action.jobs) };
    case "jobs/error":
      return { ...state, jobsLoading: false, jobsError: action.message };
    case "health/loaded":
      return { ...state, health: action.health, healthError: null };
    case "health/error":
      return { ...state, healthError: action.message };
    case "select":
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
    case "selection/loading":
      return { ...state, selectionLoading: true, selectionError: null };
    case "selection/loaded":
      return { ...state, selectionLoading: false, selectionError: null, selectedJob: action.detail };
    case "selection/error":
      return { ...state, selectionLoading: false, selectionError: action.message };
    case "report/loaded":
      return {
        ...state,
        report: action.report,
        activeCitedChunkIds:
          action.report.followups.length > 0
            ? action.report.followups[action.report.followups.length - 1].cited_chunk_ids
            : state.activeCitedChunkIds,
      };
    case "chunks/loaded":
        const deduped = action.chunks.filter(
          (chunk, index, arr) => arr.findIndex((candidate) => candidate.chunk_id === chunk.chunk_id) === index,
        );
        return { ...state, chunks: deduped };
    case "progress/append":
      const last = state.progressEvents[state.progressEvents.length - 1];
      if (last && last.ts === action.event.ts && last.progress === action.event.progress) {
        return state;
      }
      return { ...state, progressEvents: [...state.progressEvents, action.event] };
    case "stream/state":
      return { ...state, streamState: action.value };
    case "status/update":
      if (!state.selectedJob) return state;
      return {
        ...state,
        selectedJob: {
          ...state.selectedJob,
          status: action.status,
          error: action.error ?? state.selectedJob.error,
        },
      };
    case "filter/set":
      return { ...state, filter: action.filter };
    case "cited/set":
      return { ...state, activeCitedChunkIds: action.chunkIds };
    case "research/submitting":
      return { ...state, isSubmittingResearch: action.value };
    case "followup/submitting":
      return { ...state, isSubmittingFollowup: action.value };
    case "job/upsert":
      const withoutExisting = state.jobs.filter((job) => job.job_id !== action.job.job_id);
      return {
        ...state,
        jobs: sortJobsDescending([action.job, ...withoutExisting]),
        selectedJob:
          state.selectedJob?.job_id === action.job.job_id
            ? { ...state.selectedJob, ...action.job }
            : state.selectedJob,
      };
    case "job/remove":
      return {
        ...state,
        jobs: state.jobs.filter((job) => job.job_id !== action.jobId),
      };
    case "followup/append":
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
    default:
      return state;
  }
}

const WorkspaceContext = createContext<{
  state: WorkspaceState;
  dispatch: React.Dispatch<WorkspaceAction>;
  refreshJobs: (mode?: "initial" | "silent") => Promise<void>;
  loadEvidenceChunks: (jobId: string, chunkIds: string[]) => Promise<void>;
  hydrateSelection: (jobId: string, silent?: boolean) => Promise<void>;
} | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);
  const router = useRouter();

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof FrontendApiError) return error.message;
    if (error instanceof Error) return error.message;
    return "An unexpected error occurred.";
  };

  const refreshJobs = useCallback(async (mode: "initial" | "silent" = "silent") => {
    if (mode === "initial") dispatch({ type: "jobs/loading" });
    try {
      const jobs = await listJobs();
      dispatch({ type: "jobs/loaded", jobs });
    } catch (error) {
      dispatch({ type: "jobs/error", message: getErrorMessage(error) });
    }
  }, []);

  const refreshHealth = useCallback(async () => {
    try {
      const h = await getHealth();
      dispatch({ type: "health/loaded", health: h });
    } catch (error) {
      dispatch({ type: "health/error", message: getErrorMessage(error) });
    }
  }, []);

  const loadEvidenceChunks = useCallback(async (jobId: string, chunkIds: string[]) => {
    const uniqueChunkIds = [...new Set(chunkIds.filter(Boolean))];
    if (uniqueChunkIds.length === 0) {
      dispatch({ type: "chunks/loaded", chunks: [] });
      return;
    }
    try {
      const chunks = await Promise.all(uniqueChunkIds.map((chunkId) => getChunk(jobId, chunkId)));
      dispatch({ type: "chunks/loaded", chunks });
    } catch (error) {
      dispatch({ type: "selection/error", message: getErrorMessage(error) });
    }
  }, []);

  const hydrateSelection = useCallback(async (jobId: string, silent = false) => {
    if (!silent) dispatch({ type: "selection/loading" });
    try {
      const detail = await getJobDetail(jobId);
      dispatch({ type: "selection/loaded", detail });
      dispatch({ type: "job/upsert", job: detail });

      if (detail.status === "complete" || detail.has_persisted_report) {
        const report = await getReportDetail(jobId);
        dispatch({ type: "report/loaded", report });
        const latestCitedChunkIds = report.followups.length > 0 ? report.followups[report.followups.length - 1].cited_chunk_ids : [];
        await loadEvidenceChunks(jobId, latestCitedChunkIds);
        dispatch({ type: "stream/state", value: "closed" });
      }
    } catch (error) {
      if (error instanceof FrontendApiError && error.status === 404) {
        dispatch({ type: "select", jobId: null });
        router.replace("/");
      } else {
        dispatch({ type: "selection/error", message: getErrorMessage(error) });
      }
    }
  }, [router, loadEvidenceChunks]);

  useEffect(() => {
    refreshJobs("initial");
    refreshHealth();
    const interval = setInterval(() => {
      refreshJobs("silent");
      refreshHealth();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshJobs, refreshHealth]);

  const value = useMemo(() => ({
    state,
    dispatch,
    refreshJobs,
    loadEvidenceChunks,
    hydrateSelection,
  }), [state, refreshJobs, loadEvidenceChunks, hydrateSelection]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
