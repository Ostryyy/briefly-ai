export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { env } from "@server/config/env";
import { statusStore } from "@server/state/statusStore";
import { processJob } from "@server/workers/processJob";
import { withAuth } from "@server/middleware/withAuth";
import { getYoutubeVideoDurationSeconds } from "@server/services/ytUtils";
import { createRateLimiter, clientIp } from "@server/middleware/rateLimit";

import type { AuthUser } from "@shared/types/auth";
import type { JobStatus, SummaryLevel } from "@shared/types/job";

const E2E_MODE = process.env.E2E_MODE === "true";

type YoutubeJobBody = {
  url: string;
  level: SummaryLevel;
};

const limiter = createRateLimiter(env.RATE_LIMIT_PER_MIN);

const MAX_DURATION_SECONDS = env.MAX_VIDEO_MINUTES * 60;

const PROD_RE =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w\-]{11}/i;

const TEST_RE =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w\-]+/i;
const YT_URL_RE = E2E_MODE ? TEST_RE : PROD_RE;

export const POST = withAuth(async (req: NextRequest, user: AuthUser) => {
  if (!limiter.allow(clientIp(req.headers))) {
    return NextResponse.json(
      { error: "Too many requests", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  let body: Partial<YoutubeJobBody> = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = (body.url ?? "").trim();
  const level = body.level;

  if (!url || !level) {
    return NextResponse.json(
      { error: "Missing required fields: url, level" },
      { status: 400 }
    );
  }
  if (!YT_URL_RE.test(url)) {
    return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
  }

  try {
    const duration = await getYoutubeVideoDurationSeconds(url);
    if (!Number.isFinite(duration)) {
      return NextResponse.json(
        { error: "Unable to read video duration" },
        { status: 400 }
      );
    }
    if (duration! > MAX_DURATION_SECONDS) {
      return NextResponse.json(
        {
          error: `Video too long. Maximum allowed duration is ${env.MAX_VIDEO_MINUTES} minutes.`,
        },
        { status: 400 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch video information" },
      { status: 500 }
    );
  }

  const jobId = uuidv4();
  const initialStatus: JobStatus = {
    jobId,
    status: "PENDING",
    progress: 0,
    userEmail: user.email,
  };

  statusStore.set(jobId, initialStatus);

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

    await statusStore.set(jobId, jobStatus, user.userId);
  });

  return NextResponse.json({ jobId }, { status: 202 });
});
