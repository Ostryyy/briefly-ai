import { SummaryLevel } from "./JobStatus";

export interface BaseJobParams {
  jobId: string;
  level: SummaryLevel;
  email: string;
}

export type ProcessJobParams =
  | (BaseJobParams & {
      source: "youtube";
      url: string;
    })
  | (BaseJobParams & {
      source: "upload";
      audioPath: string;
    });
