import { test, expect, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@server/middleware/withAuth", () => ({
  withAuth:
    (handler: any) =>
    (req: any): Promise<Response> =>
      handler(req, {
        userId: "507f1f77bcf86cd799439011",
        email: "t@example.com",
      }),
}));
vi.mock("@server/middleware/rateLimit", () => ({
  createRateLimiter: () => ({ allow: () => true }),
  clientIp: () => "127.0.0.1",
}));
vi.mock("@server/services/ytUtils", () => ({
  getYoutubeVideoDurationSeconds: vi.fn(async () => 600),
}));
vi.mock("@server/state/statusStore", () => ({
  statusStore: { set: vi.fn() },
}));
vi.mock("@server/workers/processJob", () => ({
  processJob: vi.fn(async () => {}),
}));

import { POST } from "../../src/app/api/youtube/route";

test("youtube: 400 gdy brak wymaganych pól", async () => {
  const req = new Request("http://localhost/api/youtube", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  }) as unknown as NextRequest;

  const res = await POST(req);
  expect(res.status).toBe(400);
  const json = await res.json();
  expect(json.error).toMatch(/Missing required fields/i);
});
