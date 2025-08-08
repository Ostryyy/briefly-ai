import { SummaryLevel } from "./job";

export interface BaseJobParams {
  jobId: string;
  level: SummaryLevel;
  email: string;
  userId: string;
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
