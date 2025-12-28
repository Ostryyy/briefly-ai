import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

const statusSet = vi.hoisted(() => vi.fn());
const processJob = vi.hoisted(() => vi.fn(async () => {}));
const allowMock = vi.hoisted(() => vi.fn(() => true));
const getDur = vi.hoisted(() => vi.fn<(url: string) => Promise<number>>());

// ---- mocks ----
vi.mock("@server/middleware/withAuth", () => ({
  withAuth:
    (h: any) =>
    (req: any): Promise<Response> =>
      h(req, { userId: "507f1f77bcf86cd799439011", email: "t@example.com" }),
}));

vi.mock("@server/middleware/rateLimit", () => ({
  createRateLimiter: () => ({ allow: allowMock }),
  clientIp: () => "127.0.0.1",
}));

vi.mock("@server/state/statusStore", () => ({
  statusStore: { set: statusSet },
}));

vi.mock("@server/workers/processJob", () => ({ processJob }));

vi.mock("@server/services/ytUtils", () => ({
  getYoutubeVideoDurationSeconds: getDur,
}));

const loadPOST = async () => {
  const mod = await import("../../src/app/api/youtube/route");
  return mod.POST as (req: NextRequest) => Promise<Response>;
};

describe("POST /api/youtube", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.stubEnv("SKIP_ENV_VALIDATION", "true");
    allowMock.mockReturnValue(true);
    getDur.mockResolvedValue(600);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("SKIP_ENV_VALIDATION", "true");
  });

  test("429 when rate limiter denies", async () => {
    allowMock.mockReturnValueOnce(false);
    const POST = await loadPOST();

    const req = new Request("http://x/api/youtube", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://youtu.be/abcdef1", level: "short" }),
    }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(processJob).not.toHaveBeenCalled();
  });

  test("400 when body is invalid JSON", async () => {
    const POST = await loadPOST();
    const req = new Request("http://x/api/youtube", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(processJob).not.toHaveBeenCalled();
  });

  test("400 when required fields are missing", async () => {
    const POST = await loadPOST();
    const req = new Request("http://x/api/youtube", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(String(json.error)).toMatch(/Missing required fields/i);
    expect(processJob).not.toHaveBeenCalled();
  });

  test("400 for non-YouTube URL", async () => {
    const POST = await loadPOST();
    const req = new Request("http://x/api/youtube", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/x", level: "medium" }),
    }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(String(json.error)).toMatch(/Invalid YouTube URL/i);
    expect(processJob).not.toHaveBeenCalled();
  });

  test("400 when duration is not finite (NaN)", async () => {
    getDur.mockResolvedValueOnce(NaN as unknown as number);
    const POST = await loadPOST();

    const req = new Request("http://x/api/youtube", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        level: "medium",
      }),
    }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(String(json.error)).toMatch(/Unable to read video duration/i);
    expect(processJob).not.toHaveBeenCalled();
  });

  test("500 when fetching metadata throws (yt-dlp error)", async () => {
    getDur.mockRejectedValueOnce(new Error("yt-dlp timed out"));
    const POST = await loadPOST();

    const req = new Request("http://x/api/youtube", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://youtu.be/dQw4w9WgXcQ",
        level: "medium",
      }),
    }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(processJob).not.toHaveBeenCalled();
  });

  test("400 when duration exceeds MAX_VIDEO_MINUTES", async () => {
    vi.stubEnv("MAX_VIDEO_MINUTES", "10");
    vi.resetModules();
    const POST = await loadPOST();

    getDur.mockResolvedValueOnce(60 * 11);

    const req = new Request("http://x/api/youtube", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://youtu.be/dQw4w9WgXcQ",
        level: "medium",
      }),
    }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(String(json.error)).toMatch(/Maximum allowed duration/i);
    expect(processJob).not.toHaveBeenCalled();
  });

  test("202 when duration equals MAX_VIDEO_MINUTES (edge OK)", async () => {
    vi.stubEnv("MAX_VIDEO_MINUTES", "10");
    vi.resetModules();
    const POST = await loadPOST();

    getDur.mockResolvedValueOnce(60 * 10);

    const req = new Request("http://x/api/youtube", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        level: "short",
      }),
    }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(202);
    expect(statusSet).toHaveBeenCalledTimes(1);
    expect(processJob).toHaveBeenCalledTimes(1);
  });

  test("202 on success (youtu.be) → sets PENDING once and calls processJob with args", async () => {
    const POST = await loadPOST();

    const req = new Request("http://x/api/youtube", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://youtu.be/dQw4w9WgXcQ",
        level: "medium",
      }),
    }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(202);
    const json = await res.json();
    expect(typeof json.jobId).toBe("string");

    expect(statusSet).toHaveBeenCalledTimes(1);
    const [calledJobId, calledStatus, thirdArg] = (statusSet as any).mock
      .calls[0];
    expect(calledJobId).toBe(json.jobId);
    expect(calledStatus.status).toBe("PENDING");
    expect(thirdArg).toBeDefined();

    expect(processJob).toHaveBeenCalledTimes(1);
    const [args] = (processJob as any).mock.calls[0];
    expect(args).toMatchObject({
      jobId: json.jobId,
      source: "youtube",
      url: "https://youtu.be/dQw4w9WgXcQ",
      level: "medium",
      email: "t@example.com",
      userId: "507f1f77bcf86cd799439011",
    });
  });

  test("attaches catch: sets FAILED when processJob rejects", async () => {
    const POST = await loadPOST();
    (processJob as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => Promise.reject(new Error("boom"))
    );

    const req = new Request("http://x/api/youtube", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        level: "medium",
      }),
    }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(202);

    await vi.waitFor(() => expect(statusSet).toHaveBeenCalledTimes(2));

    const [, failedCall] = (statusSet as any).mock.calls;
    const [jobId2, status2, userId2] = failedCall;
    expect(status2.status).toBe("FAILED");
    expect(status2.progress).toBe(100);
    expect(status2.userEmail).toBe("t@example.com");
    expect(userId2).toBe("507f1f77bcf86cd799439011");
  });

  test("accepts youtube.com/watch?v= and youtu.be/ URLs", async () => {
    const POST = await loadPOST();

    // youtube.com/watch?v=...
    let req = new Request("http://x/api/youtube", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        level: "short",
      }),
    }) as unknown as NextRequest;
    let res = await POST(req);
    expect(res.status).toBe(202);

    // youtu.be/...
    req = new Request("http://x/api/youtube", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://youtu.be/dQw4w9WgXcQ",
        level: "short",
      }),
    }) as unknown as NextRequest;
    res = await POST(req);
    expect(res.status).toBe(202);
  });
});
