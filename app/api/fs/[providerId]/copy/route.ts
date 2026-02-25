import { auth } from "@/lib/auth";
import { getStorageAdapter } from "@/lib/storage";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { providerId } = await params;
  const { srcBucket, srcKey, dstBucket, dstKey } = await req.json();

  if (!srcBucket || !srcKey || !dstBucket || !dstKey) {
    return NextResponse.json({ error: "缺少必填参数" }, { status: 400 });
  }

  try {
    const adapter = await getStorageAdapter(providerId);
    await adapter.copyObject(srcBucket, srcKey, dstBucket, dstKey);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(`[copy] Provider ${providerId} 错误:`, e);
    return NextResponse.json({ error: e.message || "复制失败" }, { status: 500 });
  }
}
