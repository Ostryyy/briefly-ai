export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@server/db/mongodb";
import { withAuth } from "@server/middleware/withAuth";
import { ObjectId, WithId } from "mongodb";

const VALID_STATUSES = ["PENDING", "READY", "FAILED"] as const;
type StatusFilter = (typeof VALID_STATUSES)[number];

const isValidStatus = (v: string): v is StatusFilter =>
  (VALID_STATUSES as readonly string[]).includes(v);

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

export const GET = withAuth(async (req: NextRequest, user) => {
  const db = await getDb();
  const jobsCol = db.collection<JobDbDoc>("jobs");

  const url = new URL(req.url);
  const rawStatus = url.searchParams.get("status");

  let page = parseInt(url.searchParams.get("page") || "1", 10);
  let limit = parseInt(url.searchParams.get("limit") || "10", 10);

  if (Number.isNaN(page) || page < 1) page = 1;
  if (Number.isNaN(limit) || limit < 1) limit = 10;
  if (limit > 50) limit = 50;

  const query: { userId: ObjectId; status?: StatusFilter } = {
    userId: ObjectId.createFromHexString(user.userId),
  };

  if (rawStatus && isValidStatus(rawStatus)) {
    query.status = rawStatus;
  }

  const skip = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    jobsCol
      .find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray() as Promise<WithId<JobDbDoc>[]>,
    jobsCol.countDocuments(query),
  ]);

  return NextResponse.json({
    jobs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});
