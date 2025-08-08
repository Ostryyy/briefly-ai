export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@server/db/mongodb";
import { compare } from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

interface UserDocument {
  _id: ObjectId;
  email: string;
  password: string;
  username: string;
}

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, password } = body || {};

  if (!email || !password) {
    return NextResponse.json(
      { error: "Missing email or password" },
      { status: 400 }
    );
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const db = await getDb();

    const user = (await db
      .collection("users")
      .findOne({ email })) as UserDocument | null;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const passwordMatch = await compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
