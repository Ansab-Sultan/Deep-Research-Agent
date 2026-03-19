import type { JobFilter, JobListItem, JobStatus, ReportSection } from "@/lib/types";

export const DEPTH_OPTIONS = [
  {
    value: "quick",
    label: "Quick",
    iterations: 1,
    sections: 4,
    description: "Fast reconnaissance for a directional answer.",
  },
  {
    value: "standard",
    label: "Standard",
    iterations: 2,
    sections: 8,
    description: "Balanced depth for most research decisions.",
  },
  {
    value: "deep",
    label: "Deep",
    iterations: 3,
    sections: 12,
    description: "Long-form synthesis with broader evidence coverage.",
  },
] as const;

export const PIPELINE_STEPS = [
  { node: "planner", label: "Planning", detail: "Turn the topic into a research plan." },
  { node: "researcher", label: "Researching", detail: "Gather evidence across search iterations." },
  { node: "summarizer", label: "Summarizing", detail: "Condense raw findings into usable notes." },
  { node: "critic", label: "Critiquing", detail: "Check sufficiency and identify remaining gaps." },
  { node: "writer_planner", label: "Outlining", detail: "Build the report structure and sections." },
  { node: "section_writer", label: "Drafting", detail: "Write section-by-section report content." },
  { node: "writer_assembler", label: "Assembling", detail: "Stitch the draft into a complete report." },
  { node: "polish", label: "Polishing", detail: "Refine tone, coherence, and final formatting." },
] as const;

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Unknown time";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diff = date.getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const minutes = Math.round(diff / 60000);

  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, "minute");
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return formatter.format(hours, "hour");
  }

  const days = Math.round(hours / 24);
  return formatter.format(days, "day");
}

export function slugifyHeading(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[`*_~]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function extractReportSections(markdown: string): ReportSection[] {
  const sections: ReportSection[] = [];
  const seen = new Set<string>();

  for (const line of markdown.split("\n")) {
    const match = /^(##|###)\s+(.+)$/.exec(line.trim());
    if (!match) {
      continue;
    }

    const label = match[2].trim();
    let id = slugifyHeading(label);

    if (!id) {
      continue;
    }

    let suffix = 2;
    while (seen.has(id)) {
      id = `${id}-${suffix}`;
      suffix += 1;
    }

    seen.add(id);
    sections.push({ id, label });
  }

  return sections;
}

export function formatNodeLabel(node: string): string {
  const step = PIPELINE_STEPS.find((item) => item.node === node);
  if (step) {
    return step.label;
  }

  return node
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function filterJobs(jobs: JobListItem[], filter: JobFilter): JobListItem[] {
  if (filter === "active") {
    return jobs.filter((job) => job.status === "queued" || job.status === "running");
  }

  if (filter === "completed") {
    return jobs.filter((job) => job.has_persisted_report || job.status === "complete");
  }

  if (filter === "failed") {
    return jobs.filter((job) => job.status === "failed");
  }

  return jobs;
}

export function statusLabel(status: JobStatus): string {
  if (status === "queued") {
    return "Queued";
  }

  if (status === "running") {
    return "Running";
  }

  if (status === "complete") {
    return "Complete";
  }

  return "Failed";
}

export function truncate(value: string, length: number): string {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, Math.max(length - 1, 0)).trimEnd()}…`;
}
