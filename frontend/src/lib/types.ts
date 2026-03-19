export type Depth = "quick" | "standard" | "deep";
export type JobStatus = "queued" | "running" | "complete" | "failed";

export type ThemeName = "light" | "dark";

export type ResearchRequest = {
  topic: string;
  depth: Depth;
};

export type ResearchResponse = {
  job_id: string;
  status: JobStatus;
};

export type JobStatusResponse = {
  job_id: string;
  status: JobStatus;
  report_id: string | null;
  error: string | null;
};

export type JobListItem = {
  job_id: string;
  status: JobStatus;
  title: string | null;
  depth: string | null;
  created_at: string | null;
  report_id: string | null;
  error: string | null;
  has_persisted_report: boolean;
};

export type JobDetailResponse = JobListItem;

export type DeleteJobResponse = {
  job_id: string;
  deleted: boolean;
};

export type FollowUpRequest = {
  question: string;
};

export type FollowUpResponse = {
  answer: string;
  cited_chunk_ids: string[];
};

export type FollowUpRecord = {
  question: string;
  answer: string;
  cited_chunk_ids: string[];
  asked_at: string;
};

export type ChunkRecord = {
  job_id: string;
  chunk_id: string;
  heading: string;
  text: string;
  char_start: number;
  char_end: number;
};

export type ReportDetail = {
  _id: string;
  title: string;
  report_markdown: string;
  sources: string[];
  depth: string;
  created_at: string;
  chunks: Array<Partial<ChunkRecord> & { chunk_id: string }>;
  followups: FollowUpRecord[];
};

export type HealthServiceStatus = {
  status: string;
  detail?: string;
  provider?: string;
  device?: string;
};

export type HealthResponse = {
  status: string;
  services: Record<string, HealthServiceStatus>;
  llm: HealthServiceStatus;
  embedding: HealthServiceStatus;
};

export type ProgressEvent = {
  node: string;
  progress: string;
  ts: string;
};

export type CompleteEvent = {
  job_id: string;
  report_id: string;
};

export type ErrorEvent = {
  job_id: string;
  code: string;
  message: string;
};

export type StreamEvent =
  | { type: "progress"; payload: ProgressEvent }
  | { type: "complete"; payload: CompleteEvent }
  | { type: "error"; payload: ErrorEvent };

export type JobFilter = "all" | "active" | "completed" | "failed";
export type MobilePanel = "progress" | "sources" | "chunks" | "followups";

export type ReportSection = {
  id: string;
  label: string;
};

export type ComposerDraft = {
  topic: string;
  depth: Depth;
};
