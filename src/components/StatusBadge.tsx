import type { JobStatusType } from "@shared/types/jobs";

export default function StatusBadge({ status }: { status: JobStatusType }) {
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
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status]}`}
    >
      {status}
    </span>
  );
}
