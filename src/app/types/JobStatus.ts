export type StatusType =
  | "PENDING"
  | "DOWNLOADING"
  | "TRANSCRIBING"
  | "SUMMARIZING"
  | "READY"
  | "FAILED";

export interface JobStatus {
  jobId: string;
  status: StatusType;
  progress: number;
  message?: string;
  userEmail: string;
  summary?: string;
}

export type SummaryLevel = "short" | "medium" | "detailed" | "extreme";
