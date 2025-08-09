export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@server/db/mongodb";
import { withAuth } from "@server/middleware/withAuth";
import { ObjectId, WithId } from "mongodb";

type JobStatus =
  | "PENDING"
  | "DOWNLOADING"
  | "TRANSCRIBING"
  | "SUMMARIZING"
  | "READY"
  | "FAILED";

type JobDbDoc = {
  _id: ObjectId;
  jobId: string;
  userId: ObjectId;
  status: JobStatus;
  progress: number;
  updatedAt?: Date;
  createdAt?: Date;
  userEmail?: string;
  message?: string;
  summary?: string;
};

const VALID_STATUSES: readonly JobStatus[] = [
  "PENDING",
  "DOWNLOADING",
  "TRANSCRIBING",
  "SUMMARIZING",
  "READY",
  "FAILED",
] as const;

const ACTIVE_STATUSES: readonly JobStatus[] = [
  "PENDING",
  "DOWNLOADING",
  "TRANSCRIBING",
  "SUMMARIZING",
] as const;

function isJobStatus(s: string): s is JobStatus {
  return (VALID_STATUSES as readonly string[]).includes(s);
}

function normalizeStatus(raw: string): string {
  return raw.trim().toUpperCase();
}

function parseStatusQuery(raw: string | null) {
  if (!raw) return undefined;

  const val = normalizeStatus(raw);

  if (val === "ACTIVE") {
    return { $in: [...ACTIVE_STATUSES] as JobStatus[] };
  }

  if (val.includes(",")) {
    const parts = val.split(",").map((p) => normalizeStatus(p));
    const filtered = parts.filter(isJobStatus) as JobStatus[];
    if (filtered.length > 0) {
      return { $in: filtered };
    }
    return undefined;
  }

  if (isJobStatus(val)) return val as JobStatus;
  return undefined;
}

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const db = await getDb();
    const jobsCol = db.collection<JobDbDoc>("jobs");

    const url = new URL(req.url);
    const rawStatus = url.searchParams.get("status");

    let page = parseInt(url.searchParams.get("page") || "1", 10);
    let limit = parseInt(url.searchParams.get("limit") || "10", 10);

    if (Number.isNaN(page) || page < 1) page = 1;
    if (Number.isNaN(limit) || limit < 1) limit = 10;
    if (limit > 50) limit = 50;

    const statusQuery = parseStatusQuery(rawStatus);

    const query: {
      userId: ObjectId;
      status?: JobStatus | { $in: JobStatus[] };
    } = {
      userId: ObjectId.createFromHexString(user.userId),
    };

    if (statusQuery) {
      query.status = statusQuery;
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
        totalPages: Math.ceil(total / limit || 1),
      },
    });
  } catch (err) {
    console.error("GET /api/jobs error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
