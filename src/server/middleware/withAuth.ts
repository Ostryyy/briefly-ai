import "server-only";
import type { AuthUser } from "@shared/types/auth";
import { NextRequest, NextResponse } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";

interface AuthTokenPayload extends JwtPayload {
  userId: string;
  email: string;
}

export function withAuth(
  handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const authHeader = req.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : undefined;

    const token = bearer;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      ) as AuthTokenPayload;

      if (!decoded?.userId || !decoded?.email) {
        return NextResponse.json(
          { error: "Invalid token payload" },
          { status: 400 }
        );
      }

      const user: AuthUser = {
        userId: decoded.userId,
        email: decoded.email,
      };

      return handler(req, user);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }
  };
}
