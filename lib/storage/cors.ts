import type { CORSRule } from "@aws-sdk/client-s3";

export type CorsStatus = {
  origin: string;
  rules: CORSRule[];
  recommendedRule: CORSRule;
  compatible: boolean;
  issues: string[];
};

/** 校验完整的 http(s) origin（无路径、凭证或通配符），返回标准化源。 */
export function parseCorsOrigin(value: unknown): string | null {
  if (typeof value !== "string" || !/^https?:\/\/[^/?#\s]+$/.test(value) || (value.includes("*") || value.includes("\\"))) return null;
  try {
    const url = new URL(value);
    if (url.pathname !== "/" || url.username || url.password || !url.hostname || url.origin === "null") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** 为指定 origin 提供浏览器 PUT、下载和分片 ETag 所需的最小规则。 */
export function recommendedCorsRule(origin: string): CORSRule {
  return {
    AllowedOrigins: [origin],
    AllowedMethods: ["PUT", "GET", "HEAD"],
    AllowedHeaders: ["Content-Type"],
    ExposeHeaders: ["ETag"],
    MaxAgeSeconds: 3600,
  };
}

function matches(pattern: string, value: string): boolean {
  return new RegExp(`^${pattern.split("*").map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`, "i").test(value);
}

/** 按服务的首条匹配规则判断 origin 的方法、请求头和 ETag 暴露能力。 */
export function inspectCors(origin: string, rules: CORSRule[]): CorsStatus {
  const issues: string[] = [];
  const originRules = rules.filter((rule) => rule.AllowedOrigins?.some((p) => matches(p, origin)));
  for (const method of ["PUT", "GET", "HEAD"]) {
    const matching = originRules.find((rule) => rule.AllowedMethods?.includes(method));
    if (!matching) issues.push(`未允许 ${origin} 使用 ${method}`);
  }
  const put = originRules.find((rule) => rule.AllowedMethods?.includes("PUT"));
  if (put && !put.AllowedHeaders?.some((p) => matches(p, "Content-Type"))) {
    issues.push("PUT 规则未允许 Content-Type 请求头（可设为 Content-Type 或 *）");
  }
  // 上传成功响应也按首条 origin/method 规则返回；不能只检查后续规则。
  if (put && !put.ExposeHeaders?.some((p) => p.toLowerCase() === "etag" || p === "*")) {
    issues.push("首条匹配 PUT 的规则未暴露 ETag；请在 ExposeHeaders 中加入 ETag，否则分片无法完成");
  }
  return { origin, rules, recommendedRule: recommendedCorsRule(origin), compatible: issues.length === 0, issues };
}

/** 保留原规则，在最前添加精确 origin 规则，避免被已有宽泛规则遮挡。 */
export function mergeCorsRules(origin: string, rules: CORSRule[]): CORSRule[] {
  if (inspectCors(origin, rules).compatible) return rules;
  const exactIndex = rules.findIndex((rule) => rule.AllowedOrigins?.length === 1 && rule.AllowedOrigins[0] === origin);
  if (exactIndex < 0) return [recommendedCorsRule(origin), ...rules];
  const existing = rules[exactIndex];
  const recommended = recommendedCorsRule(origin);
  const merged: CORSRule = {
    ...existing,
    AllowedMethods: [...new Set([...(existing.AllowedMethods ?? []), ...recommended.AllowedMethods!])],
    AllowedHeaders: [...new Set([...(existing.AllowedHeaders ?? []), ...recommended.AllowedHeaders!])],
    ExposeHeaders: [...new Set([...(existing.ExposeHeaders ?? []), ...recommended.ExposeHeaders!])],
  };
  return [merged, ...rules.filter((_, i) => i !== exactIndex)];
}

/** 将权限、兼容性和网络错误转成可执行指导，不将读取失败误认为没有配置。 */
export function corsFailure(error: unknown): { status: number; message: string } {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const metadata = error as { $metadata?: { httpStatusCode?: number } } | null;
  const denied = metadata?.$metadata?.httpStatusCode === 403 || /AccessDenied|AccessForbidden/i.test(detail);
  return {
    status: denied ? 403 : 502,
    message: `${denied ? "云端拒绝 CORS 管理，请确认 GetBucketCors / PutBucketCors 权限" : "无法通过 S3 兼容接口读取或更新 CORS"}（${detail}）。OSS 的 S3 兼容 API 未列出 CORS 管理；COS 或其他服务也可能有接口/签名限制。请在对应云控制台的存储桶 CORS 设置中保留原规则，添加下方推荐规则（精确 Origin、PUT/GET/HEAD、Content-Type、暴露 ETag）。此检查失败不影响继续尝试直传。`,
  };
}
