import { auth } from "@/lib/auth";
import { getStorageAdapter } from "@/lib/storage";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { providerId } = await params;
  const body = await req.json();
  const { bucket } = body;

  if (!bucket) {
    return NextResponse.json({ error: "缺少必填参数" }, { status: 400 });
  }

  try {
    const adapter = await getStorageAdapter(providerId);

    // Support both single key and batch keys
    if (Array.isArray(body.keys) && body.keys.length > 0) {
      await adapter.deleteObjects(bucket, body.keys);
    } else if (body.key) {
      await adapter.deleteObject(bucket, body.key);
    } else {
      return NextResponse.json({ error: "缺少 key 或 keys 参数" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(`[delete] Provider ${providerId} 错误:`, e);
    return NextResponse.json({ error: e.message || "删除失败" }, { status: 500 });
  }
}
