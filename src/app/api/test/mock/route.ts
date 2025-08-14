export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

const OVERRIDABLE_KEYS = [
  // Mocks / fast path
  "MOCK_MODE",
  "MOCK_SPEED",
  "MOCK_FAIL_PROB",
  "MOCK_FORCE_FAIL",

  // Limits
  "RATE_LIMIT_PER_MIN",
  "MAX_UPLOAD_MB",
  "MAX_VIDEO_MINUTES",

  // yt-dlp
  "YTDLP_PATH",
  "YTDLP_COOKIES_PATH",
] as const;

const ALIASES: Record<string, (typeof OVERRIDABLE_KEYS)[number]> = {
  maxUploadMb: "MAX_UPLOAD_MB",
  rateLimitPerMin: "RATE_LIMIT_PER_MIN",
  videoMaxMinutes: "MAX_VIDEO_MINUTES",
  speed: "MOCK_SPEED",
  failProb: "MOCK_FAIL_PROB",
  forceFail: "MOCK_FORCE_FAIL",
  mockMode: "MOCK_MODE",
};

const DEFAULTS: Record<string, string | null> = {};
for (const k of OVERRIDABLE_KEYS) DEFAULTS[k] = process.env[k] ?? null;

function currentSnapshot() {
  const env: Record<string, string | null> = {};
  for (const k of OVERRIDABLE_KEYS) env[k] = process.env[k] ?? null;
  return env;
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "test" && process.env.E2E_MODE !== "true") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  for (const [alias, realKey] of Object.entries(ALIASES)) {
    if (alias in body && body[alias] !== undefined) {
      body[realKey] = body[alias];
      delete body[alias];
    }
  }

  if (body?.reset) {
    for (const k of OVERRIDABLE_KEYS) {
      const v = DEFAULTS[k];
      if (v === null || v === undefined) delete process.env[k];
      else process.env[k] = String(v);
    }
    return NextResponse.json({ ok: true, env: currentSnapshot() });
  }

  for (const k of OVERRIDABLE_KEYS) {
    if (k in body && body[k] !== undefined) {
      process.env[k] = String(body[k]);
    }
  }

  return NextResponse.json({ ok: true, env: currentSnapshot() });
}
