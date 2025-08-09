export type JobStatusType =
  | "PENDING"
  | "DOWNLOADING"
  | "TRANSCRIBING"
  | "SUMMARIZING"
  | "READY"
  | "FAILED";

export type JobDoc = {
  _id?: string;
  jobId: string;
  userId: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  status: JobStatusType;
  progress: number;
  userEmail?: string;
  message?: string;
  summary?: string;
};

export type PaginatedJobs = {
  jobs: JobDoc[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type SingleJobResponse = { job: JobDoc };
