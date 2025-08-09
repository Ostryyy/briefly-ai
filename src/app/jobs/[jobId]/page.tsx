"use client";
import { useEffect, useState } from "react";
import { api } from "@lib/api";
import { useJobStream } from "@lib/sse";
import type { JobDoc } from "@shared/types/jobs";
import StatusBadge from "@components/StatusBadge";

export default function JobDetails({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const [jobId, setJobId] = useState<string>("");
  const [job, setJob] = useState<JobDoc | null>(null);
  const live = useJobStream(jobId || undefined);

  useEffect(() => {
    (async () => {
      const p = await params;
      setJobId(p.jobId);
    })();
  }, [params]);

  useEffect(() => {
    if (!jobId) return;
    api
      .job(jobId)
      .then((r) => setJob(r.job))
      .catch((e) => console.error(e));
  }, [jobId]);

  const view = live ?? job;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Job {jobId}</h1>
        {view && <StatusBadge status={view.status} />}
      </div>

      {!view ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : (
        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Status</div>
              <div className="font-medium">{view.status}</div>
            </div>
            <div>
              <div className="text-gray-500">Progress</div>
              <div className="font-medium">{view.progress ?? 0}%</div>
            </div>
            {view.message && (
              <div className="col-span-2">
                <div className="text-gray-500">Message</div>
                <div className="font-mono text-xs">{view.message}</div>
              </div>
            )}
          </div>

          {view.summary && (
            <article className="prose max-w-none">
              <pre className="whitespace-pre-wrap">{view.summary}</pre>
            </article>
          )}
        </div>
      )}
    </div>
  );
}
