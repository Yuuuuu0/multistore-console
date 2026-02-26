import { requireSession } from "@/lib/api-auth";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";
import { getStorageAdapter } from "@/lib/storage";
import { toErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

/** 最大上传文件大小：100MB */
const MAX_UPLOAD_SIZE = 100 * 1024 * 1024;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const [, authError] = await requireSession();
  if (authError) return authError;

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
  const bucket = searchParams.get("bucket");
  const key = searchParams.get("key");

  if (!bucket || !key) {
    return NextResponse.json({ error: "缺少 bucket 或 key 参数" }, { status: 400 });
  }

  try { const adapter = await getStorageAdapter(providerId);
  const body = req.body;
  if (!body) {
    return NextResponse.json({ error: "缺少文件内容" }, { status: 400 });
  }
  
  // Read the stream into a buffer for S3 SDK compatibility
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const buffer = Buffer.concat(chunks);
  
  await adapter.putObject(bucket, key, buffer, buffer.length);
  
  return NextResponse.json({ success: true }); } catch (e: unknown) { console.error(`[upload] Provider ${providerId} 错误:`, e);
  return NextResponse.json({ error: toErrorMessage(e) || "上传失败" }, { status: 500 }); }
}
