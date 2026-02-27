import { requireSession } from "@/lib/api-auth";
import { getStorageAdapter } from "@/lib/storage";
import { toErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB

function computePartSize(fileSize: number): number {
  if (fileSize < 500 * 1024 * 1024) return 10 * 1024 * 1024;       // <500MB: 10MB/part
  if (fileSize < 2 * 1024 * 1024 * 1024) return 50 * 1024 * 1024;  // <2GB: 50MB/part
  return 100 * 1024 * 1024;                                          // <5GB: 100MB/part
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const [, authError] = await requireSession();
  if (authError) return authError;

  const { providerId } = await params;
  const { bucket, key, contentType, fileSize } = await req.json();

  if (!bucket || !key) {
    return NextResponse.json({ error: "缺少 bucket 或 key 参数" }, { status: 400 });
  }
  if (!fileSize || fileSize <= 0) {
    return NextResponse.json({ error: "缺少有效的 fileSize" }, { status: 400 });
  }
  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: `文件大小超过限制（最大 5GB）` }, { status: 400 });
  }
  if (key.length > 1024 || key.startsWith("/") || key.includes("..")) {
    return NextResponse.json({ error: "key 参数非法" }, { status: 400 });
  }

  try {
    const adapter = await getStorageAdapter(providerId);
    const uploadId = await adapter.createMultipartUpload(bucket, key, contentType);
    const partSize = computePartSize(fileSize);
    const totalParts = Math.ceil(fileSize / partSize);

    return NextResponse.json({ uploadId, partSize, totalParts });
  } catch (e: unknown) {
    console.error(`[multipart/create] Provider ${providerId} 错误:`, e);
    return NextResponse.json({ error: toErrorMessage(e) || "创建分片上传失败" }, { status: 500 });
  }
}
