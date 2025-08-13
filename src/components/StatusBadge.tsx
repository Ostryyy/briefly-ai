import type { JobStatusType } from "@shared/types/jobs";
import type React from "react";

type StatusBadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  status: JobStatusType;
};
export default function StatusBadge({
  status,
  className,
  ...rest
}: StatusBadgeProps) {
  const colors: Record<JobStatusType, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    DOWNLOADING: "bg-blue-100 text-blue-700",
    TRANSCRIBING: "bg-indigo-100 text-indigo-700",
    SUMMARIZING: "bg-purple-100 text-purple-700",
    READY: "bg-emerald-100 text-emerald-700",
    FAILED: "bg-rose-100 text-rose-700",
  };
  return (
    <span
      data-testid={`status-badge-${status.toLowerCase()}`}
      {...rest}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        colors[status]
      }${className ? " " + className : ""}`}
    >
      {status}
    </span>
  );
}
