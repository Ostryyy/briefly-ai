import { JobStatus } from "@/app/types/JobStatus";
import { sendJobStatusEmail } from "@/app/lib/emailService";

const statusMap = new Map<string, JobStatus>();
const listeners = new Map<string, Set<(status: JobStatus) => void>>();

export const statusStore = {
  set: async (jobId: string, status: JobStatus) => {
    statusMap.set(jobId, status);
    listeners.get(jobId)?.forEach((cb) => cb(status));

    if (
      status.status === "PENDING" ||
      status.status === "READY" ||
      status.status === "FAILED"
    )
      await sendJobStatusEmail(jobId, status);
  },
  onChange: (jobId: string, callback: (status: JobStatus) => void) => {
    if (!listeners.has(jobId)) {
      listeners.set(jobId, new Set());
    }
    listeners.get(jobId)!.add(callback);
  },

  removeListener: (jobId: string, callback: (status: JobStatus) => void) => {
    listeners.get(jobId)?.delete(callback);
  },
  get: (jobId: string) => statusMap.get(jobId),
  all: () => [...statusMap.entries()],
};
