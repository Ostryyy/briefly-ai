import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

const statusSet = vi.hoisted(() => vi.fn());
const processJob = vi.hoisted(() => vi.fn(async () => {}));
const ensureTempDirExistsSpy = vi.hoisted(() => vi.fn(async () => {}));
const getTempDirSpy = vi.hoisted(() => vi.fn(() => "/tmp/briefly-tests"));
const removeTempFileSpy = vi.hoisted(() => vi.fn(async () => {}));
const allowMock = vi.hoisted(() => vi.fn(() => true));
const writeFileSpy = vi.hoisted(() => vi.fn(async () => {}));

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

vi.mock("fs/promises", () => ({ writeFile: writeFileSpy }));

vi.mock("@server/services/audioUtils", () => ({
  ensureTempDirExists: ensureTempDirExistsSpy,
  getTempDir: getTempDirSpy,
  removeTempFile: removeTempFileSpy,
}));

import { POST } from "../../src/app/api/upload/route";

const norm = (p: string) => p.replaceAll("\\", "/");

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.stubEnv("SKIP_ENV_VALIDATION", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("SKIP_ENV_VALIDATION", "true");
  });

  test("415 when content-type is missing or not multipart/form-data", async () => {
    const req = new Request("http://x/api/upload", {
      method: "POST",
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(415);

    const req2 = new Request("http://x/api/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    }) as unknown as NextRequest;
    const res2 = await POST(req2);
    expect(res2.status).toBe(415);
  });

  test("400 when required fields are missing", async () => {
    const fd = new FormData();
    const req = new Request("http://x/api/upload", {
      method: "POST",
      body: fd,
    }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(String(json.error)).toMatch(/Missing required fields/i);
  });

  test("400 when level is invalid", async () => {
    const fd = new FormData();
    fd.append("file", new Blob(["x"], { type: "audio/mpeg" }), "a.mp3");
    fd.append("level", "mega" as any);

    const req = new Request("http://x/api/upload", {
      method: "POST",
      body: fd,
    }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
    expect(String(json.error)).toMatch(/Invalid level/i);
  });

  test("413 when file larger than MAX_UPLOAD_MB (by content-length precheck)", async () => {
    vi.stubEnv("MAX_UPLOAD_MB", "1"); // 1 MB
    vi.resetModules();
    const { POST: UPLOAD_POST } = await import(
      "../../src/app/api/upload/route"
    );

    const headers = new Headers();
    headers.set("content-type", "multipart/form-data; boundary=xxx");
    headers.set("content-length", String(2 * 1024 * 1024)); // 2 MB

    const fakeReq = { method: "POST", headers } as unknown as NextRequest;

    const res = await UPLOAD_POST(fakeReq);
    expect(res.status).toBe(413);
  });

  test("ignores non-numeric content-length precheck", async () => {
    vi.stubEnv("MAX_UPLOAD_MB", "1");
    vi.resetModules();
    const { POST: UPLOAD_POST } = await import(
      "../../src/app/api/upload/route"
    );

    const fd = new FormData();
    fd.append("file", new Blob(["x"], { type: "audio/mpeg" }), "x.mp3");
    fd.append("level", "short");

    const headers = new Headers({ "content-length": "abc" });

    const req = new Request("http://x/api/upload", {
      method: "POST",
      headers,
      body: fd,
    }) as unknown as NextRequest;

    const res = await UPLOAD_POST(req);
    expect(res.status).toBe(202);
  });

  test("413 when actual file size exceeds limit", async () => {
    vi.stubEnv("MAX_UPLOAD_MB", "0");
    vi.resetModules();
    const { POST: UPLOAD_POST } = await import(
      "../../src/app/api/upload/route"
    );

    const fd = new FormData();
    const blob = new Blob(["123"], { type: "audio/mpeg" });
    fd.append("file", blob, "x.mp3");
    fd.append("level", "short");

    const req = new Request("http://x/api/upload", {
      method: "POST",
      body: fd,
    }) as unknown as NextRequest;

    const res = await UPLOAD_POST(req);
    expect(res.status).toBe(413);
  });

  test("429 when rate limiter denies", async () => {
    allowMock.mockReturnValueOnce(false);
    const fd = new FormData();
    fd.append("file", new Blob(["x"], { type: "audio/mpeg" }), "x.mp3");
    fd.append("level", "medium");

    const req = new Request("http://x/api/upload", {
      method: "POST",
      body: fd,
    }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  test("202 on success, writes temp file and calls statusStore + processJob (mp3 ext)", async () => {
    const fd = new FormData();
    const blob = new Blob(["just a tiny file"], { type: "audio/mpeg" });
    fd.append("file", blob, "x.mp3");
    fd.append("level", "medium");

    const req = new Request("http://x/api/upload", {
      method: "POST",
      body: fd,
    }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(202);
    const json = await res.json();

    expect(typeof json.jobId).toBe("string");
    expect(statusSet).toHaveBeenCalledTimes(1);
    expect(processJob).toHaveBeenCalledTimes(1);
    expect(writeFileSpy).toHaveBeenCalledTimes(1);

    // ensureTempDirExists before writeFile
    const ensureOrder = (ensureTempDirExistsSpy as any).mock
      .invocationCallOrder[0];
    const writeOrder = (writeFileSpy as any).mock.invocationCallOrder[0];
    expect(ensureOrder).toBeLessThan(writeOrder);

    // statusStore.set third arg is userId
    const [, , thirdArg] = (statusSet as any).mock.calls[0];
    expect(thirdArg).toBe("507f1f77bcf86cd799439011");

    const [args] = (processJob as any).mock.calls[0];
    expect(args).toMatchObject({
      source: "upload",
      level: "medium",
      email: "t@example.com",
      userId: "507f1f77bcf86cd799439011",
    });
    expect(norm(String(args.audioPath))).toMatch(
      /\/tmp\/briefly-tests\/[a-f0-9-]+\.mp3$/i
    );

    // no cleanup on happy-path
    expect(removeTempFileSpy).not.toHaveBeenCalled();
  });

  test("sets correct extension for WAV and M4A-like types", async () => {
    {
      const fd = new FormData();
      fd.append("file", new Blob(["x"], { type: "audio/wav" }), "a.wav");
      fd.append("level", "short");
      const req = new Request("http://x/api/upload", {
        method: "POST",
        body: fd,
      }) as unknown as NextRequest;
      const res = await POST(req);
      expect(res.status).toBe(202);
      const [called] = (processJob as any).mock.calls.slice(-1)[0];
      expect(String(called.audioPath)).toMatch(/\.wav$/);
    }

    {
      const fd = new FormData();
      fd.append("file", new Blob(["x"], { type: "audio/aac" }), "a.aac");
      fd.append("level", "short");
      const req = new Request("http://x/api/upload", {
        method: "POST",
        body: fd,
      }) as unknown as NextRequest;
      const res = await POST(req);
      expect(res.status).toBe(202);
      const [called] = (processJob as any).mock.calls.slice(-1)[0];
      expect(String(called.audioPath)).toMatch(/\.m4a$/);
    }
  });

  test("falls back to .bin extension for unknown/opaque mime", async () => {
    const fd = new FormData();
    // explicit opaque/unknown type; route uses 'application/octet-stream' fallback → .bin
    fd.append(
      "file",
      new Blob(["x"], { type: "application/octet-stream" }),
      "x.bin"
    );
    fd.append("level", "short");
    const req = new Request("http://x/api/upload", {
      method: "POST",
      body: fd,
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(202);
    const [called] = (processJob as any).mock.calls.slice(-1)[0];
    expect(String(called.audioPath)).toMatch(/\.bin$/);
  });

  test("cleans temp file when processJob rejects immediately", async () => {
    (processJob as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => Promise.reject(new Error("boom"))
    );

    const fd = new FormData();
    fd.append("file", new Blob(["x"], { type: "audio/mpeg" }), "x.mp3");
    fd.append("level", "medium");

    const req = new Request("http://x/api/upload", {
      method: "POST",
      body: fd,
    }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(202);

    await vi.waitFor(() => expect(removeTempFileSpy).toHaveBeenCalledTimes(1));

    const p = (removeTempFileSpy as any).mock.calls[0][0];
    expect(norm(String(p))).toMatch(/\/tmp\/briefly-tests\/[a-f0-9-]+\.mp3$/i);
  });

  test("returns 500 when writeFile fails", async () => {
    writeFileSpy.mockRejectedValueOnce(new Error("disk full"));

    const fd = new FormData();
    fd.append("file", new Blob(["x"], { type: "audio/mpeg" }), "x.mp3");
    fd.append("level", "short");

    const req = new Request("http://x/api/upload", {
      method: "POST",
      body: fd,
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
