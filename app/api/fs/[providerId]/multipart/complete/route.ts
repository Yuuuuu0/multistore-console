import { requireSession } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { getStorageAdapter } from "@/lib/storage";
import { toErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const [session, authError] = await requireSession();
  if (authError) return authError;

  const { providerId } = await params;
  const { bucket, key, uploadId, parts } = await req.json();

  if (!bucket || !key || !uploadId || !Array.isArray(parts) || parts.length === 0) {
    return NextResponse.json({ error: "缺少必填参数" }, { status: 400 });
  }

  try {
    const adapter = await getStorageAdapter(providerId);
    await adapter.completeMultipartUpload(
      bucket,
      key,
      uploadId,
      parts.map((p: { partNumber: number; etag: string }) => ({
        PartNumber: p.partNumber,
        ETag: p.etag,
      }))
    );

    await logAudit({
      action: "FILE_UPLOAD",
      description: `分片上传完成 ${key} 到 ${bucket} (${parts.length} 分片)`,
      userId: session.user.id,
      username: session.user.name || "unknown",
      providerId,
      bucket,
      req,
      metadata: { uploadType: "multipart", partCount: parts.length },
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error(`[multipart/complete] Provider ${providerId} 错误:`, e);
    return NextResponse.json({ error: toErrorMessage(e) || "完成分片上传失败" }, { status: 500 });
  }
}
