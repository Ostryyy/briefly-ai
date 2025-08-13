import { test, expect, request, chromium } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
const email = process.env.E2E_EMAIL ?? "e2e+test@briefly.ai";
const username = process.env.E2E_USERNAME ?? "e2e+test";
const password = process.env.E2E_PASSWORD ?? "E2E-StrongPass!123";
const tokenKey = process.env.E2E_TOKEN_KEY ?? "briefly_token";

test("prepare auth storage state", async () => {
  const api = await request.newContext({ baseURL });

  let res = await api.post("/api/auth/login", { data: { email, password } });

  if (!res.ok()) {
    const txt = await res.text().catch(() => "");
    if (
      res.status() === 404 ||
      res.status() === 401 ||
      /user not found/i.test(txt)
    ) {
      const reg = await api.post("/api/auth/register", {
        data: { email, username, password },
      });
      expect(
        reg.ok(),
        `Registration failed: ${reg.status()} ${await reg.text()}`
      ).toBe(true);
      res = await api.post("/api/auth/login", { data: { email, password } });
    }
  }

  expect(res.ok(), `Login failed: ${res.status()} ${await res.text()}`).toBe(
    true
  );
  const json = await res.json();
  const token = json.token ?? json.accessToken;
  expect(
    token,
    `Login response missing token: ${JSON.stringify(json)}`
  ).toBeTruthy();

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  await ctx.addInitScript(
    ([k, v]) => window.localStorage.setItem(k, v),
    [tokenKey, token]
  );
  const page = await ctx.newPage();
  await page.goto(baseURL);
  await ctx.storageState({ path: "playwright/.auth/user.json" });
  await browser.close();
  await api.dispose();
});
