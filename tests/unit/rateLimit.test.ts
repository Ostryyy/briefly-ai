import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { createRateLimiter, clientIp } from "@server/middleware/rateLimit";

describe("rateLimit.createRateLimiter (global token bucket)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("allows up to N per minute then blocks", () => {
    const rl = createRateLimiter(2);
    const key = "k-1";
    expect(rl.allow(key)).toBe(true);
    expect(rl.allow(key)).toBe(true);
    expect(rl.allow(key)).toBe(false);
  });

  test("window refills after 60s (exact boundary)", () => {
    const rl = createRateLimiter(1);
    const key = "k-2";

    expect(rl.allow(key)).toBe(true);
    expect(rl.allow(key)).toBe(false);

    vi.advanceTimersByTime(60_000 - 1);
    expect(rl.allow(key)).toBe(false);

    vi.advanceTimersByTime(1);
    expect(rl.allow(key)).toBe(true);
  });

  test("fractional refill works (e.g., 2 tokens/min → +1 after 30s)", () => {
    const rl = createRateLimiter(2);
    const key = "k-3";

    expect(rl.allow(key)).toBe(true);
    expect(rl.allow(key)).toBe(true);
    expect(rl.allow(key)).toBe(false);

    vi.advanceTimersByTime(30_000);
    expect(rl.allow(key)).toBe(true);
    expect(rl.allow(key)).toBe(false);
  });

  test("tokens never exceed the burst limit (clamped to N)", () => {
    const rl = createRateLimiter(2);
    const key = "k-4";

    vi.advanceTimersByTime(10 * 60_000);
    expect(rl.allow(key)).toBe(true);
    expect(rl.allow(key)).toBe(true);
    expect(rl.allow(key)).toBe(false);
  });

  test("limit=0 means always blocked", () => {
    const rl = createRateLimiter(0);
    const key = "k-5";
    expect(rl.allow(key)).toBe(false);
    expect(rl.allow(key)).toBe(false);
  });

  test("state is shared across limiter instances for the same key (by design now)", () => {
    const rl1 = createRateLimiter(2);
    const rl2 = createRateLimiter(2);
    const key = "shared-key";

    expect(rl1.allow(key)).toBe(true);
    expect(rl1.allow(key)).toBe(true);
    expect(rl2.allow(key)).toBe(false);
  });
});

describe("rateLimit.clientIp", () => {
  test("picks first IP from x-forwarded-for and trims spaces", () => {
    const h = new Headers({
      "x-forwarded-for": " 203.0.113.5 , 70.41.3.18, 150.172.238.178",
    });
    expect(clientIp(h)).toBe("203.0.113.5");
  });

  test("returns 'local' when header missing or empty", () => {
    expect(clientIp(new Headers())).toBe("local");
    const h = new Headers({ "x-forwarded-for": "" });
    expect(clientIp(h)).toBe("local");
  });

  test("works with IPv6 too", () => {
    const h = new Headers({ "x-forwarded-for": "2001:db8::1" });
    expect(clientIp(h)).toBe("2001:db8::1");
  });
});
