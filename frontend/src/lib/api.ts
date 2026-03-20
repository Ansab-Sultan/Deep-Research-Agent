import type {
  ChunkRecord,
  DeleteJobResponse,
  FollowUpResponse,
  HealthResponse,
  JobDetailResponse,
  JobListItem,
  JobStatusResponse,
  ReportDetail,
  ResearchRequest,
  ResearchResponse,
} from "@/lib/types";

type ApiErrorShape = {
  code?: string;
  message?: string;
};

export class FrontendApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, status: number, code = "API_ERROR") {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const BROWSER_API_BASE = "/api";

function buildApiUrl(path: string): string {
  return `${BROWSER_API_BASE}${path}`;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let errorBody: ApiErrorShape | null = null;

    try {
      errorBody = (await response.json()) as ApiErrorShape;
    } catch {
      errorBody = null;
    }

    throw new FrontendApiError(
      errorBody?.message || `Request failed with status ${response.status}`,
      response.status,
      errorBody?.code || "API_ERROR",
    );
  }

  return (await response.json()) as T;
}

export function buildStreamUrl(jobId: string): string {
  return buildApiUrl(`/research/${jobId}/stream`);
}

export async function getHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>("/health");
}

export async function listJobs(): Promise<JobListItem[]> {
  return fetchJson<JobListItem[]>("/jobs");
}

export async function getJobDetail(jobId: string): Promise<JobDetailResponse> {
  return fetchJson<JobDetailResponse>(`/jobs/${jobId}`);
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  return fetchJson<JobStatusResponse>(`/research/${jobId}`);
}

export async function getReportDetail(jobId: string): Promise<ReportDetail> {
  return fetchJson<ReportDetail>(`/history/${jobId}`);
}

export async function getChunks(jobId: string): Promise<ChunkRecord[]> {
  return fetchJson<ChunkRecord[]>(`/research/${jobId}/chunks`);
}

export async function getChunk(jobId: string, chunkId: string): Promise<ChunkRecord> {
  return fetchJson<ChunkRecord>(`/research/${jobId}/chunks/${chunkId}`);
}

export async function submitResearch(payload: ResearchRequest): Promise<ResearchResponse> {
  return fetchJson<ResearchResponse>("/research", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitFollowup(jobId: string, question: string): Promise<FollowUpResponse> {
  return fetchJson<FollowUpResponse>(`/research/${jobId}/followup`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export async function deleteJob(jobId: string): Promise<DeleteJobResponse> {
  return fetchJson<DeleteJobResponse>(`/jobs/${jobId}`, {
    method: "DELETE",
  });
}
