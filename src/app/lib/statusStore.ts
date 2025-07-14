import { JobStatus } from "@/app/types/JobStatus";

const statusMap = new Map<string, JobStatus>();

export const statusStore = {
  set: (jobId: string, status: JobStatus) => statusMap.set(jobId, status),
  get: (jobId: string) => statusMap.get(jobId),
  all: () => [...statusMap.entries()],
};
