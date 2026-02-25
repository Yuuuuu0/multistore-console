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
  const { bucket, oldKey, newKey } = await req.json();

  if (!bucket || !oldKey || !newKey) {
    return NextResponse.json({ error: "缺少必填参数" }, { status: 400 });
  }

  try {
    const adapter = await getStorageAdapter(providerId);

    // S3 没有原生的重命名操作，需要复制后删除
    await adapter.copyObject(bucket, oldKey, bucket, newKey);
    await adapter.deleteObject(bucket, oldKey);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(`[rename] Provider ${providerId} 错误:`, e);
    return NextResponse.json({ error: e.message || "重命名失败" }, { status: 500 });
  }
}
