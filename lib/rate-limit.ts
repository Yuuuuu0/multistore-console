import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

/**
 * 内存 Token Bucket 速率限制器
 * 无需 Redis，适用于单实例部署
 */

type RateLimitEntry = {
  count: number;
  resetTime: number;
};

type RateLimitConfig = {
  /** 时间窗口内最大请求数 */
  max: number;
  /** 时间窗口（毫秒） */
  windowMs: number;
};

/** 预设配置 */
export const RATE_LIMIT_PRESETS = {
  /** 登录等敏感操作：10 次/分钟 */
  sensitive: { max: 10, windowMs: 60 * 1000 },
  /** 一般 API 操作：100 次/分钟 */
  general: { max: 100, windowMs: 60 * 1000 },
  /** 文件上传：20 次/分钟 */
  upload: { max: 20, windowMs: 60 * 1000 },
} as const;

const stores = new Map<string, Map<string, RateLimitEntry>>();

// 定期清理过期条目（每 5 分钟）
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [, store] of stores) {
      for (const [key, entry] of store) {
        if (now > entry.resetTime) {
          store.delete(key);
        }
      }
    }
  }, CLEANUP_INTERVAL);
  // 不阻止进程退出
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

/**
 * 从请求中提取客户端 IP
 */
function getClientIP(req: Request | NextRequest): string {
  // NextRequest 有 headers()
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP.trim();
  return "unknown";
}

/**
 * 检查速率限制
 * 返回 null 表示通过，返回 NextResponse 表示被限制
 *
 * 使用方式：
 * ```
 * const limited = checkRateLimit(req, "login", RATE_LIMIT_PRESETS.sensitive);
 * if (limited) return limited;
 * ```
 */
export function checkRateLimit(
  req: Request | NextRequest,
  namespace: string,
  config: RateLimitConfig
): NextResponse | null {
  ensureCleanup();

  const ip = getClientIP(req);
  const storeKey = namespace;

  if (!stores.has(storeKey)) {
    stores.set(storeKey, new Map());
  }
  const store = stores.get(storeKey)!;

  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetTime) {
    // 新窗口
    store.set(ip, { count: 1, resetTime: now + config.windowMs });
    return null;
  }

  entry.count++;

  if (entry.count > config.max) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return NextResponse.json(
      { error: `请求过于频繁，请 ${retryAfter} 秒后重试` },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.max),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(entry.resetTime / 1000)),
        },
      }
    );
  }

  return null;
}
