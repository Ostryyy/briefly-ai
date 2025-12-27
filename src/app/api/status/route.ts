export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@server/middleware/withAuth";
import type { AuthUser } from "@shared/types/auth";

import { statusStore } from "@server/state/statusStore";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAuth(async (req: NextRequest, _user: AuthUser) => {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const status = statusStore.get(jobId);
  if (!status) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(status, {
    headers: { "Cache-Control": "no-store" },
  });
});
