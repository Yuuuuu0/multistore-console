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
  const { bucket, key, uploadId, partNumber } = await req.json();

  if (!bucket || !key || !uploadId || !partNumber) {
    return NextResponse.json({ error: "缺少必填参数" }, { status: 400 });
  }
  if (partNumber < 1 || partNumber > 10000) {
    return NextResponse.json({ error: "partNumber 范围为 1-10000" }, { status: 400 });
  }

  try {
    const adapter = await getStorageAdapter(providerId);
    const url = await adapter.getPresignedUploadPartUrl(bucket, key, uploadId, partNumber);
    return NextResponse.json({ url });
  } catch (e: unknown) {
    console.error(`[multipart/presign] Provider ${providerId} 错误:`, e);
    return NextResponse.json({ error: toErrorMessage(e) || "获取预签名 URL 失败" }, { status: 500 });
  }
}
