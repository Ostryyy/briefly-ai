import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { statusStore } from "@/app/lib/statusStore";
import { JobStatus } from "@/app/types/JobStatus";
import { SummaryLevel } from "@/app/types/JobStatus";
import { processJob } from "@/app/lib/workers/processJob";
import { withAuth } from "@/app/lib/middleware/authMiddleware";
import { AuthUser } from "@/app/types/AuthUser";
import { getYoutubeVideoDurationSeconds } from "@/app/lib/ytUtils";

interface YoutubeJobBody {
  url: string;
  level: SummaryLevel;
  email: string;
}

export const POST = withAuth(async (req: NextRequest, user: AuthUser) => {
  let body: YoutubeJobBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, level } = body;

  const requiredFields = { url, level };
  const missingFields = Object.entries(requiredFields)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingFields.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missingFields.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const duration = await getYoutubeVideoDurationSeconds(url);
    const maxDurationSeconds = 30 * 60;

    if (duration > maxDurationSeconds) {
      return NextResponse.json(
        { error: "Video too long. Maximum allowed duration is 30 minutes." },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("Error fetching video metadata:", err);
    return NextResponse.json(
      { error: "Failed to fetch video information" },
      { status: 500 }
    );
  }

  const jobId = uuidv4();
  const jobStatus: JobStatus = {
    jobId,
    status: "PENDING",
    progress: 0,
    userEmail: user.email,
  };

  statusStore.set(jobId, jobStatus);

  processJob({
    jobId,
    source: "youtube",
    url,
    level: level as SummaryLevel,
    email: user.email,
    userId: user.userId,
  }).catch(async (err: Error) => {
    const jobStatus: JobStatus = {
      jobId,
      status: "FAILED",
      progress: 100,
      userEmail: user.email,
      message: err.message,
    };

    statusStore.set(jobId, jobStatus);
  });

  return NextResponse.json({ jobId });
});
