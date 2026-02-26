import { NextResponse } from "next/server";

/**
 * SSRF 防护：校验用户提供的 S3 Endpoint 是否安全
 * 阻止指向内部网络的请求
 */

/** 私有 IP 范围（RFC 1918 + 特殊地址） */
const PRIVATE_IP_PATTERNS = [
  /^127\./,                          // Loopback
  /^10\./,                           // RFC 1918 Class A
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // RFC 1918 Class B
  /^192\.168\./,                     // RFC 1918 Class C
  /^169\.254\./,                     // Link-local
  /^0\./,                            // 0.0.0.0/8
  /^100\.(6[4-9]|[7-9]\d|1[0-2]\d)\./, // Carrier-grade NAT (100.64/10)
  /^198\.1[89]\./,                   // Benchmark testing
  /^::1$/,                           // IPv6 loopback
  /^fc00:/i,                         // IPv6 unique local
  /^fe80:/i,                         // IPv6 link-local
];

/** 被禁止的主机名 */
const BLOCKED_HOSTNAMES = [
  "localhost",
  "metadata.google.internal",          // GCP 元数据服务
  "metadata.internal",
];

/**
 * 检查 IP 地址是否为私有/内部地址
 */
function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

/**
 * 校验 S3 Endpoint URL 是否安全
 * 返回 null 表示安全，返回错误信息表示不安全
 */
export function validateEndpoint(endpoint: string): string | null {
  if (!endpoint) return null; // 空 endpoint 使用默认（如 AWS），安全

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return "无效的 Endpoint URL 格式";
  }

  const hostname = url.hostname.toLowerCase();

  // 检查被禁止的主机名
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return `不允许的 Endpoint 地址: ${hostname}`;
  }

  // 检查 IP 地址是否为私有
  if (isPrivateIP(hostname)) {
    return `不允许的内部网络地址: ${hostname}`;
  }

  // 检查端口（云元数据服务常用 80/443 以外的端口）
  // 放行：无端口（默认 443/80）、常见 S3 端口（9000 MinIO、8333 等）
  // 不做端口限制，因为 MinIO 等自托管服务可能用任意端口

  // 检查协议
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return `不允许的协议: ${url.protocol}，仅支持 http/https`;
  }

  return null;
}

/**
 * 用于 API Route 的 endpoint 校验
 * 返回 null 表示安全，返回 NextResponse 表示被拒绝
 */
export function checkEndpoint(endpoint: string): NextResponse | null {
  const error = validateEndpoint(endpoint);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
  return null;
}
