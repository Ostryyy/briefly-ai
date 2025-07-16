import { JobStatus } from "@/app/types/JobStatus";
import { sendJobStatusEmail } from "@/app/lib/emailService";

const statusMap = new Map<string, JobStatus>();

export const statusStore = {
  set: async (jobId: string, status: JobStatus) => {
    statusMap.set(jobId, status);

    if (
      status.status === "PENDING" ||
      status.status === "READY" ||
      status.status === "FAILED"
    )
      await sendJobStatusEmail(jobId, status);
  },

  get: (jobId: string) => statusMap.get(jobId),
  all: () => [...statusMap.entries()],
};
