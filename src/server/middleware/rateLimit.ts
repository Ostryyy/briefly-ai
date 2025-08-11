type Bucket = { tokens: number; last: number };
const buckets = new Map<string, Bucket>();

export function createRateLimiter(tokensPerMin: number) {
  const interval = 60_000;
  return {
    allow(key: string) {
      const now = Date.now();
      const b = buckets.get(key) ?? { tokens: tokensPerMin, last: now };
      const refill = ((now - b.last) / interval) * tokensPerMin;
      b.tokens = Math.min(tokensPerMin, b.tokens + refill);
      b.last = now;
      if (b.tokens < 1) {
        buckets.set(key, b);
        return false;
      }
      b.tokens -= 1;
      buckets.set(key, b);
      return true;
    },
  };
}

export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
