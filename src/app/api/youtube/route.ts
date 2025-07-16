import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { statusStore } from "@/app/lib/statusStore";
import { JobStatus } from "@/app/types/JobStatus";
import { SummaryLevel } from "@/app/types/JobStatus";
import { processJob } from "@/app/lib/workers/processJob";

interface YoutubeJobBody {
  url: string;
  level: SummaryLevel;
  email: string;
}

export async function POST(req: NextRequest) {
  let body: YoutubeJobBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, level, email } = body;

  const requiredFields = { url, level, email };
  const missingFields = Object.entries(requiredFields)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingFields.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missingFields.join(", ")}` },
      { status: 400 }
    );
  }

  const jobId = uuidv4();
  const jobStatus: JobStatus = {
    jobId,
    status: "PENDING",
    progress: 0,
    userEmail: email,
  };

  statusStore.set(jobId, jobStatus);

  processJob({
    jobId,
    source: "youtube",
    url,
    level: level as SummaryLevel,
    email,
  }).catch(async (err: Error) => {
    const jobStatus: JobStatus = {
      jobId,
      status: "FAILED",
      progress: 100,
      userEmail: email,
      message: err.message,
    };

    statusStore.set(jobId, jobStatus);
  });

  return NextResponse.json({ jobId });
}
