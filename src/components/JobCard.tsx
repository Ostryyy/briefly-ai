import Link from "next/link";
import type { JobDoc } from "@shared/types/jobs";
import StatusBadge from "./StatusBadge";

export default function JobCard({ job }: { job: JobDoc }) {
  return (
    <Link
      data-testid={`jobcard-${job.jobId}`}
      href={`/jobs/${job.jobId}`}
      className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-xs text-gray-500 truncate">
          {job.jobId}
        </div>
        <StatusBadge status={job.status} data-testid="jobcard-status" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Progress</div>
          <div className="font-medium">{job.progress ?? 0}%</div>
        </div>
        <div>
          <div className="text-gray-500">Updated</div>
          <div className="font-medium">
            {job.updatedAt ? new Date(job.updatedAt).toLocaleString() : "—"}
          </div>
        </div>
      </div>

      {job.message && (
        <div className="mt-3 text-xs text-gray-600 line-clamp-2">
          {job.message}
        </div>
      )}
    </Link>
  );
}
