import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkRateLimit, RATE_LIMIT_PRESETS } from "./rate-limit";

function createMockRequest(ip = "1.2.3.4"): Request {
  return new Request("http://localhost/api/test", {
    headers: { "x-forwarded-for": ip },
  });
}

describe("rate-limit", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("首次请求通过（返回 null）", () => {
    const req = createMockRequest("10.10.10.10");
    const result = checkRateLimit(req, "first-request-pass", { max: 3, windowMs: 60_000 });

    expect(result).toBeNull();
  });

  it("窗口内未超过限制的请求都通过", () => {
    const req = createMockRequest("10.10.10.11");
    const config = { max: 3, windowMs: 60_000 };

    expect(checkRateLimit(req, "within-limit", config)).toBeNull();
    expect(checkRateLimit(req, "within-limit", config)).toBeNull();
    expect(checkRateLimit(req, "within-limit", config)).toBeNull();
  });

  it("超过限制后返回 429", () => {
    const req = createMockRequest("10.10.10.12");
    const config = { max: 2, windowMs: 60_000 };

    expect(checkRateLimit(req, "exceed-limit", config)).toBeNull();
    expect(checkRateLimit(req, "exceed-limit", config)).toBeNull();

    const blocked = checkRateLimit(req, "exceed-limit", config);
    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(429);
  });

  it("不同 namespace 的限流相互独立", () => {
    const req = createMockRequest("10.10.10.13");
    const config = { max: 1, windowMs: 60_000 };

    expect(checkRateLimit(req, "namespace-a", config)).toBeNull();
    const blockedA = checkRateLimit(req, "namespace-a", config);
    expect(blockedA?.status).toBe(429);

    const allowedB = checkRateLimit(req, "namespace-b", config);
    expect(allowedB).toBeNull();
  });

  it("窗口重置后请求恢复通过", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const req = createMockRequest("10.10.10.14");
    const config = { max: 1, windowMs: 1_000 };

    expect(checkRateLimit(req, "window-reset", config)).toBeNull();
    expect(checkRateLimit(req, "window-reset", config)?.status).toBe(429);

    vi.advanceTimersByTime(1_001);

    expect(checkRateLimit(req, "window-reset", config)).toBeNull();
  });

  it("被限流响应包含 Retry-After 头", () => {
    const req = createMockRequest("10.10.10.15");
    const config = { max: 1, windowMs: 10_000 };

    expect(checkRateLimit(req, "retry-after-header", config)).toBeNull();
    const blocked = checkRateLimit(req, "retry-after-header", config);

    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("Retry-After")).toBeTruthy();
  });

  it("RATE_LIMIT_PRESETS 包含 sensitive/general/upload", () => {
    expect(RATE_LIMIT_PRESETS).toHaveProperty("sensitive");
    expect(RATE_LIMIT_PRESETS).toHaveProperty("general");
    expect(RATE_LIMIT_PRESETS).toHaveProperty("upload");
  });
});
