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
  const { srcBucket, srcKey, dstBucket, dstKey } = await req.json();

  if (!srcBucket || !srcKey || !dstBucket || !dstKey) {
    return NextResponse.json({ error: "缺少必填参数" }, { status: 400 });
  }

  try { const adapter = await getStorageAdapter(providerId);
  await adapter.copyObject(srcBucket, srcKey, dstBucket, dstKey);
  return NextResponse.json({ success: true }); } catch (e: unknown) { console.error(`[copy] Provider ${providerId} 错误:`, e);
  return NextResponse.json({ error: toErrorMessage(e) || "复制失败" }, { status: 500 }); }
}
