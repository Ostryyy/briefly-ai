export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@server/middleware/withAuth";
import { getDb } from "@server/db/mongodb";
import { ObjectId, WithId } from "mongodb";
import type { AuthUser } from "@shared/types/auth";

type UserDoc = {
  _id: ObjectId;
  email: string;
  username: string;
  password?: string;
};

export const GET = withAuth(async (_req: NextRequest, user: AuthUser) => {
  try {
    const db = await getDb();
    const users = db.collection<UserDoc>("users");

    const dbUser: WithId<UserDoc> | null = await users.findOne(
      { _id: new ObjectId(user.userId) },
      { projection: { password: 0 } }
    );

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { _id, email, username } = dbUser;
    return NextResponse.json({
      user: { id: _id.toString(), email, username },
    });
  } catch (err) {
    console.error("GET /api/me error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
