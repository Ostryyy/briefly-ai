export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import fssync from "fs";
import path from "path";

const COOKIES_PATH =
  process.env.YTDLP_COOKIES_PATH || "/etc/briefly/cookies/youtube.cookies.txt";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

function isAuthed(req: NextRequest) {
  return ADMIN_TOKEN && req.headers.get("x-admin-token") === ADMIN_TOKEN;
}

async function ensureParentDir(filePath: string) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  try {
    await fs.chmod(dir, 0o700);
  } catch {}
  return dir;
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const exists = fssync.existsSync(COOKIES_PATH);
  const stat = exists ? fssync.statSync(COOKIES_PATH) : null;
  return NextResponse.json({
    exists,
    size: stat?.size ?? 0,
    mtime: stat?.mtime?.toISOString() ?? null,
    path: COOKIES_PATH,
  });
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file)
    return NextResponse.json({ error: "Missing file" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const text = buf.toString("utf8");
  if (!/Netscape HTTP Cookie File/i.test(text)) {
    return NextResponse.json(
      {
        error: "Invalid cookies.txt (Netscape) or missing youtube.com entries",
      },
      { status: 400 }
    );
  }

  try {
    await ensureParentDir(COOKIES_PATH);
    const tmp = COOKIES_PATH + ".tmp";
    await fs.writeFile(tmp, buf, { mode: 0o600 });
    try {
      await fs.chmod(tmp, 0o600);
    } catch {}
    await fs.rename(tmp, COOKIES_PATH);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "EACCES" || e?.code === "EPERM") {
      return NextResponse.json(
        {
          error: `No write permission for ${COOKIES_PATH}. Change YTDLP_COOKIES_PATH or adjust permissions.`,
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAuthed(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    if (fssync.existsSync(COOKIES_PATH)) await fs.unlink(COOKIES_PATH);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
