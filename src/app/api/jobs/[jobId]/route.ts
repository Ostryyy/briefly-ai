export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@server/db/mongodb";
import { withAuth } from "@server/middleware/withAuth";
import type { AuthUser } from "@shared/types/auth";
import { ObjectId, WithId } from "mongodb";

type JobDbDoc = {
  _id: ObjectId;
  jobId: string;
  userId: ObjectId;
  status: string;
  progress: number;
  updatedAt?: Date;
  userEmail?: string;
  message?: string;
  summary?: string;
};

export const GET = withAuth(async (req: NextRequest, user: AuthUser) => {
  const url = new URL(req.url);
  const jobId = url.pathname.split("/").pop();

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const jobsCol = db.collection<JobDbDoc>("jobs");

    const job: WithId<JobDbDoc> | null = await jobsCol.findOne({
      jobId,
      userId: ObjectId.createFromHexString(user.userId),
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (err) {
    console.error("GET /api/jobs/[jobId] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
