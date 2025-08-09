"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@lib/api";
import type { PaginatedJobs, JobStatusType } from "@shared/types/jobs";
import JobCard from "@components/JobCard";
import { isAuthed } from "@lib/auth";
import AuthModal from "@components/AuthModal";

const FILTERS: { key?: JobStatusType | "active"; label: string }[] = [
  { label: "All" },
  { key: "active", label: "Active" },
  { key: "READY", label: "Ready" },
  { key: "FAILED", label: "Failed" },
];

export default function JobsPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [status, setStatus] = useState<JobStatusType | "active" | undefined>(
    undefined
  );
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedJobs | null>(null);
  const [loading, setLoading] = useState(false);

  const limit = 12;

  useEffect(() => {
    if (!isAuthed()) {
      setAuthOpen(true);
      return;
    }
    setLoading(true);
    api
      .jobs({ status, page, limit })
      .then((res) => setData(res))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [status, page]);

  const totalPages = useMemo(
    () => data?.pagination?.totalPages ?? 1,
    [data?.pagination]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = status === f.key || (!status && !f.key);
          return (
            <button
              key={f.label}
              onClick={() => {
                setPage(1);
                setStatus(f.key);
              }}
              className={`rounded-full px-3 py-1 text-sm ${
                active ? "bg-black text-white" : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          );
        })}
        <div className="ml-auto text-sm text-gray-500">
          {data?.pagination?.total ?? 0} items
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && (
          <div className="col-span-full text-center text-sm text-gray-500">
            Loading…
          </div>
        )}
        {!loading && data?.jobs?.length === 0 && (
          <div className="col-span-full text-center text-sm text-gray-500">
            No jobs yet.
          </div>
        )}
        {data?.jobs?.map((j) => (
          <JobCard key={j.jobId} job={j} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            className="rounded border bg-white px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <div className="text-sm">
            Page {page} / {totalPages}
          </div>
          <button
            className="rounded border bg-white px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
