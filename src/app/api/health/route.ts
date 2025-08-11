import "server-only";
import { NextResponse } from "next/server";
import { env } from "@server/config/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: env.NODE_ENV,
    ts: new Date().toISOString(),
  });
}
