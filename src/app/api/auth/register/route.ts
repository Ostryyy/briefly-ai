import { hash } from "bcryptjs";
import clientPromise from "@/app/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

interface RegisterRequestBody {
  email: string;
  username: string;
  password: string;
}

export async function POST(req: NextRequest) {
  let body: RegisterRequestBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, username, password } = body;

  if (!email || !username || !password) {
    return NextResponse.json(
      { error: "Missing email, username or password" },
      { status: 400 }
    );
  }

  try {
    const client = await clientPromise;
    const db = client.db("briefly");

    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await hash(password, 10);

    const result = await db.collection("users").insertOne({
      email,
      username,
      password: hashedPassword,
    });

    const token = jwt.sign(
      {
        userId: result.insertedId.toString(),
        email,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      message: "User registered successfully",
      token,
      user: {
        email,
        username,
        id: result.insertedId.toString(),
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
