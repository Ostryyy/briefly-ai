import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { withAuth } from "@/app/lib/middleware/authMiddleware";

export const GET = withAuth(async (req: NextRequest, user) => {
  const jobId = req.nextUrl.pathname.split("/").pop();

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db("briefly");

  const job = await db
    .collection("jobs")
    .findOne({ jobId, userId: user.userId });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({ job });
});
