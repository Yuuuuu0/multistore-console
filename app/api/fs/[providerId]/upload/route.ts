import { requireSession } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";
import { getStorageAdapter } from "@/lib/storage";
import { toErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

/** 最大上传文件大小：100MB */
const MAX_UPLOAD_SIZE = 100 * 1024 * 1024;

/** 并发上传保护 */
const MAX_GLOBAL_INFLIGHT = 24;
const MAX_PER_IP_INFLIGHT = 6;
const inflightByIP = new Map<string, number>();
let globalInflight = 0;

function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function acquireSlot(ip: string): NextResponse | null {
  const perIP = inflightByIP.get(ip) ?? 0;
  if (globalInflight >= MAX_GLOBAL_INFLIGHT || perIP >= MAX_PER_IP_INFLIGHT) {
    return NextResponse.json(
      { error: "上传并发过高，请稍后重试", retryAfterMs: 1500 },
      { status: 429 }
    );
  }
  globalInflight++;
  inflightByIP.set(ip, perIP + 1);
  return null;
}

function releaseSlot(ip: string) {
  globalInflight = Math.max(0, globalInflight - 1);
  const perIP = inflightByIP.get(ip) ?? 0;
  if (perIP <= 1) {
    inflightByIP.delete(ip);
  } else {
    inflightByIP.set(ip, perIP - 1);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const [session, authError] = await requireSession();
  if (authError) return authError;

  const clientIP = getClientIP(req);

  const limited = checkRateLimit(req, "upload", RATE_LIMIT_PRESETS.upload);
  if (limited) return limited;

  // 检查文件大小限制
  const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_UPLOAD_SIZE) {
    return NextResponse.json(
      { error: `文件大小超过限制（最大 ${MAX_UPLOAD_SIZE / 1024 / 1024}MB）` },
      { status: 413 }
    );
  }

  const { providerId } = await params;
  const { searchParams } = new URL(req.url);
  const bucket = searchParams.get("bucket")?.trim();
  const key = searchParams.get("key")?.trim();

  if (!bucket || !key) {
    return NextResponse.json({ error: "缺少 bucket 或 key 参数" }, { status: 400 });
  }
  if (key.length > 1024 || key.startsWith("/") || key.includes("..")) {
    return NextResponse.json({ error: "key 参数非法" }, { status: 400 });
  }

  const slotError = acquireSlot(clientIP);
  if (slotError) return slotError;

  try {
    const adapter = await getStorageAdapter(providerId);
    const body = req.body;
    if (!body) {
      return NextResponse.json({ error: "缺少文件内容" }, { status: 400 });
    }

    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const buffer = Buffer.concat(chunks);

    await adapter.putObject(bucket, key, buffer, buffer.length);

    await logAudit({
      action: "FILE_UPLOAD",
      description: `上传文件 ${key} 到 ${bucket}`,
      userId: session.user.id,
      username: session.user.name || "unknown",
      providerId,
      bucket,
      req,
      metadata: { fileSize: buffer.length },
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    await logAudit({
      action: "FILE_UPLOAD",
      status: "FAILURE",
      description: `上传文件 ${key} 到 ${bucket} 失败`,
      userId: session.user.id,
      username: session.user.name || "unknown",
      providerId,
      bucket,
      req,
    });
    console.error(`[upload] Provider ${providerId} 错误:`, e);
    return NextResponse.json({ error: toErrorMessage(e) || "上传失败" }, { status: 500 });
  } finally {
    releaseSlot(clientIP);
  }
}
