"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { JobDoc } from "@shared/types/jobs";

const TERMINAL = new Set<JobDoc["status"]>(["READY","FAILED"]);

export function useJobsStream(jobIds: string[] | undefined) {
  const [updates, setUpdates] = useState<Record<string, JobDoc>>({});
  const sourcesRef = useRef<Record<string, EventSource>>({});

  const ids = useMemo(() => Array.from(new Set(jobIds ?? [])), [jobIds]);

  useEffect(() => {
    const current = sourcesRef.current;

    for (const id of Object.keys(current)) {
      if (!ids.includes(id)) {
        current[id].close();
        delete current[id];
      }
    }

    ids.forEach((id) => {
      if (current[id]) return;
      const es = new EventSource(`/api/status/stream?jobId=${encodeURIComponent(id)}`);

      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data) as JobDoc;
          setUpdates((prev) => ({ ...prev, [id]: data }));
          if (TERMINAL.has(data.status)) {
            es.close();
            delete current[id];
          }
        } catch {}
      };

      es.onerror = () => {
        es.close();
        delete current[id];
      };

      current[id] = es;
    });

    return () => {
      for (const id of Object.keys(current)) {
        current[id].close();
        delete current[id];
      }
    };
  }, [ids]);

  return updates;
}
