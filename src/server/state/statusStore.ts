import "server-only";
import type { JobStatus } from "@shared/types/job";
import { getDb } from "@server/db/mongodb";
import { ObjectId } from "mongodb";
import { sendJobStatusEmail } from "@server/services/emailService";

type Listener = (status: JobStatus) => void;
type Store = ReturnType<typeof createStatusStore>;

declare global {
  var __briefly_status_store: Store | undefined;
}

function createStatusStore() {
  const statusMap = new Map<string, JobStatus>();
  const listeners = new Map<string, Set<Listener>>();
  const lastEmailedStatus = new Map<string, JobStatus["status"]>();
  const SHOULD_EMAIL: JobStatus["status"][] = ["PENDING", "READY", "FAILED"];

  function emit(jobId: string, status: JobStatus) {
    const subs = listeners.get(jobId);
    if (!subs) return;
    for (const cb of subs) {
      try {
        cb(status);
      } catch (e) {
        console.error("[statusStore] listener error:", e);
      }
    }
  }

  return {
    async set(jobId: string, status: JobStatus, userId?: string) {
      const prev = statusMap.get(jobId)?.status;
      const snapshot: JobStatus = { ...status };
      statusMap.set(jobId, snapshot);
      emit(jobId, snapshot);

      if (userId) {
        const db = await getDb();
        const now = new Date();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { jobId: _omit, ...statusFields } = snapshot;

        await db.collection("jobs").updateOne(
          { jobId, userId: new ObjectId(userId) },
          {
            $setOnInsert: {
              jobId,
              userId: new ObjectId(userId),
              createdAt: now,
            },
            $set: { ...statusFields, updatedAt: now },
          },
          { upsert: true }
        );
      }

      const changed = prev !== snapshot.status;
      const shouldEmail =
        changed &&
        SHOULD_EMAIL.includes(snapshot.status) &&
        !!snapshot.userEmail;

      if (shouldEmail) {
        const already = lastEmailedStatus.get(jobId);
        if (already !== snapshot.status) {
          try {
            await sendJobStatusEmail(jobId, snapshot);
            lastEmailedStatus.set(jobId, snapshot.status);
          } catch (err) {
            console.error("[statusStore] email send failed:", err);
          }
        }
      }

      if (snapshot.status === "READY" || snapshot.status === "FAILED") {
        setTimeout(() => {
          const s = statusMap.get(jobId);
          if (s && (s.status === "READY" || s.status === "FAILED")) {
            statusMap.delete(jobId);
            listeners.delete(jobId);
            lastEmailedStatus.delete(jobId);
          }
        }, 10 * 60 * 1000);
      }
    },

    onChange(jobId: string, cb: Listener) {
      if (!listeners.has(jobId)) listeners.set(jobId, new Set());
      listeners.get(jobId)!.add(cb);
    },

    removeListener(jobId: string, cb: Listener) {
      const set = listeners.get(jobId);
      if (!set) return;
      set.delete(cb);
      if (set.size === 0) listeners.delete(jobId);
    },

    get(jobId: string) {
      return statusMap.get(jobId);
    },

    all() {
      return [...statusMap.entries()];
    },
  };
}

export const statusStore: Store =
  globalThis.__briefly_status_store ??
  (globalThis.__briefly_status_store = createStatusStore());
