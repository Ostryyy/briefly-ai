export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@server/db/mongodb";
import { hash } from "bcryptjs";
import jwt from "jsonwebtoken";
import type { ObjectId, OptionalId } from "mongodb";

interface RegisterRequestBody {
  email: string;
  username: string;
  password: string;
}

type UserDoc = {
  _id?: ObjectId;
  email: string;
  username: string;
  password: string;
};

export async function POST(req: NextRequest) {
  let body: Partial<RegisterRequestBody> = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const username = (body.username ?? "").trim();
  const password = body.password ?? "";

  if (!email || !username || !password) {
    return NextResponse.json(
      { error: "Missing email, username or password" },
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
    const users = db.collection<UserDoc>("users");

    const existing = await users.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      const conflictField = existing.email === email ? "email" : "username";
      return NextResponse.json(
        { error: `User with this ${conflictField} already exists` },
        { status: 409 }
      );
    }

    const hashedPassword = await hash(password, 10);

    const newUser: OptionalId<UserDoc> = {
      email,
      username,
      password: hashedPassword,
    };

    const result = await users.insertOne(newUser);

    const token = jwt.sign(
      { userId: result.insertedId.toString(), email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json(
      {
        message: "User registered successfully",
        token,
        user: {
          id: result.insertedId.toString(),
          email,
          username,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
