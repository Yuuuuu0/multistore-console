import { requireSession } from "@/lib/api-auth";
import { getStorageAdapter } from "@/lib/storage";
import { toErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const [, authError] = await requireSession();
  if (authError) return authError;

  const { providerId } = await params;
  const { bucket, key, uploadId } = await req.json();

  if (!bucket || !key || !uploadId) {
    return NextResponse.json({ error: "缺少必填参数" }, { status: 400 });
  }

  try {
    const adapter = await getStorageAdapter(providerId);
    const parts = await adapter.listParts(bucket, key, uploadId);
    return NextResponse.json({ parts });
  } catch (e: unknown) {
    console.error(`[multipart/list-parts] Provider ${providerId} 错误:`, e);
    return NextResponse.json({ error: toErrorMessage(e) || "查询已上传分片失败" }, { status: 500 });
  }
}
