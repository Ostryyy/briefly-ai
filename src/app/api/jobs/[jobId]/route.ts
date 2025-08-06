import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { withAuth } from "@/app/lib/middleware/authMiddleware";
import { AuthUser } from "@/app/types/AuthUser";
import { ObjectId } from "mongodb";

export const GET = withAuth(async (req: NextRequest, user: AuthUser) => {
  const url = new URL(req.url);
  const jobId = url.pathname.split("/").pop();
  console.log(jobId);

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db("briefly");

  const job = await db.collection("jobs").findOne({
    jobId,
    userId: new ObjectId(user.userId),
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
});
