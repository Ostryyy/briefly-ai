import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { withAuth } from "@/app/lib/middleware/authMiddleware";

const VALID_STATUSES = ["PENDING", "READY", "FAILED"];

export const GET = withAuth(async (req: NextRequest, user) => {
  const client = await clientPromise;
  const db = client.db("briefly");

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  const query: {
    userId: string;
    status?: string;
  } = {
    userId: user.userId,
  };

  if (status && VALID_STATUSES.includes(status)) {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  const jobs = await db
    .collection("jobs")
    .find(query)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  const total = await db.collection("jobs").countDocuments(query);

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
