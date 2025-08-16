import { expect, APIRequestContext } from "@playwright/test";

export type TestEnvPayload = Partial<{
  maxUploadMb: number;
  rateLimitPerMin: number;
  videoMaxMinutes: number;
  speed: number | string;
  failProb: number | string;
  forceFail: boolean | string;
  mockMode: boolean | string;

  MAX_UPLOAD_MB: number | string;
  RATE_LIMIT_PER_MIN: number | string;
  MAX_VIDEO_MINUTES: number | string;
  MOCK_SPEED: number | string;
  MOCK_FAIL_PROB: number | string;
  MOCK_FORCE_FAIL: boolean | string;
  MOCK_MODE: boolean | string;
  YTDLP_PATH: string;
  YTDLP_COOKIES_PATH: string;

  reset: boolean;
}>;

export async function setMockConfig(
  request: APIRequestContext,
  cfg: TestEnvPayload
): Promise<{ ok: boolean; env: Record<string, string | null> }> {
  const res = await request.post("/api/test/mock", { data: cfg });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

export async function resetMockConfig(
  request: APIRequestContext
): Promise<void> {
  const res = await request.post("/api/test/mock", { data: { reset: true } });
  expect(res.ok()).toBeTruthy();
}

export async function getMockConfig(
  request: APIRequestContext
): Promise<Record<string, string | null>> {
  const res = await request.get("/api/test/mock");
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  return json.env as Record<string, string | null>;
}
