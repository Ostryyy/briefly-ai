"use client";
import { useEffect, useState } from "react";
import type { JobDoc } from "@shared/types/jobs";
import { getToken } from "./auth";

export function useJobStream(jobId?: string) {
  const [status, setStatus] = useState<JobDoc | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const token = getToken();
    const url =
      `/api/status/stream?jobId=${encodeURIComponent(jobId)}` +
      (token ? `&token=${encodeURIComponent(token)}` : "");
    const es = new EventSource(url);

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as JobDoc;
        setStatus(data);
      } catch {}
    };

    es.onerror = () => es.close();

    return () => {
      es.close();
    };
  }, [jobId]);

  return status;
}
