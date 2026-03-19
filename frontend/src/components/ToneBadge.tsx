"use client";

import type { JobStatus } from "@/lib/types";

interface ToneBadgeProps {
  label: string;
  tone: JobStatus | string;
}

export function ToneBadge({ label, tone }: ToneBadgeProps) {
  const getToneStyles = (t: string) => {
    if (t === "complete" || t === "ok") {
      return "bg-[var(--success-soft)] text-[var(--success)] border-[var(--success-border)]";
    }
    if (t === "running" || t === "degraded") {
      return "bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning-border)]";
    }
    if (t === "failed" || t === "error") {
      return "bg-[var(--error-soft)] text-[var(--error)] border-[var(--error-border)]";
    }
    return "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border-strong)]";
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-[0.12em] uppercase ${getToneStyles(
        tone
      )}`}
    >
      {label}
    </span>
  );
}
