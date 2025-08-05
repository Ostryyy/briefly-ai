import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/app/lib/middleware/authMiddleware";
import clientPromise from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";
import { AuthUser } from "@/app/types/AuthUser";

export const GET = withAuth(async (req: NextRequest, user: AuthUser) => {
  const client = await clientPromise;
  const db = client.db("briefly");

  const dbUser = await db
    .collection("users")
    .findOne(
      { _id: new ObjectId(user.userId) },
      { projection: { password: 0 } }
    );

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: dbUser });
});
