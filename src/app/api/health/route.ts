export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { env } from "@server/config/env";

const startedAt = Date.now();

const version =
  process.env.APP_VERSION ||
  process.env.GIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  "dev";

function healthHeaders() {
  return {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  };
}

export async function GET() {
  const body = {
    ok: true,
    env: env.NODE_ENV,
    version,
    startedAt: new Date(startedAt).toISOString(),
    uptimeSec: Number(process.uptime().toFixed(1)),
    ts: new Date().toISOString(),
  };

  return NextResponse.json(body, { headers: healthHeaders() });
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: healthHeaders(),
  });
}
