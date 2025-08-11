import { NextResponse } from "next/server";
import { getDb } from "@server/db/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    const res = await db.admin().command({ ping: 1 });
    return NextResponse.json({ ok: true, mongo: res });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
