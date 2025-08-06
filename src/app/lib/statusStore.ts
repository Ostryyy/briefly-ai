import { JobStatus } from "@/app/types/JobStatus";
import { sendJobStatusEmail } from "@/app/lib/emailService";
import clientPromise from "./mongodb";
import { ObjectId } from "mongodb";

const statusMap = new Map<string, JobStatus>();
const listeners = new Map<string, Set<(status: JobStatus) => void>>();

export const statusStore = {
  set: async (jobId: string, status: JobStatus, userId?: string) => {
    statusMap.set(jobId, status);
    listeners.get(jobId)?.forEach((cb) => cb(status));

    if (userId) {
      const client = await clientPromise;
      const db = client.db("briefly");
      await db
        .collection("jobs")
        .updateOne(
          { jobId, userId: new ObjectId(userId) },
          { $set: { ...status, updatedAt: new Date() } },
          { upsert: true }
        );
    }

    if (
      status.status === "PENDING" ||
      status.status === "READY" ||
      status.status === "FAILED"
    ) {
      sendJobStatusEmail(jobId, status).catch(console.error);
    }
  },

  onChange: (jobId: string, callback: (status: JobStatus) => void) => {
    if (!listeners.has(jobId)) {
      listeners.set(jobId, new Set());
    }
    listeners.get(jobId)?.add(callback);
  },

  removeListener: (jobId: string, callback: (status: JobStatus) => void) => {
    listeners.get(jobId)?.delete(callback);
  },

  get: (jobId: string) => statusMap.get(jobId),
  all: () => [...statusMap.entries()],
};
