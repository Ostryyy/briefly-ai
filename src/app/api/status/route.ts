import { NextRequest, NextResponse } from "next/server";
import { statusStore } from "@/app/lib/statusStore";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const status = statusStore.get(jobId);
  if (!status) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(status);
}
