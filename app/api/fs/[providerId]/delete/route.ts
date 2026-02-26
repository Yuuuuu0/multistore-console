import { requireSession } from "@/lib/api-auth";
import { getStorageAdapter } from "@/lib/storage";
import { toErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

/** 批量删除最大文件数 */
const MAX_BATCH_DELETE = 1000;

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const [, authError] = await requireSession();
  if (authError) return authError;

  const { providerId } = await params;
  const body = await req.json();
  const { bucket } = body;

  if (!bucket) {
    return NextResponse.json({ error: "缺少必填参数" }, { status: 400 });
  }

  try { const adapter = await getStorageAdapter(providerId);
  
  // Support both single key and batch keys
  if (Array.isArray(body.keys) && body.keys.length > 0) {
    if (body.keys.length > MAX_BATCH_DELETE) {
      return NextResponse.json(
        { error: `批量删除文件数超过限制（最多 ${MAX_BATCH_DELETE} 个）` },
        { status: 400 }
      );
    }
    await adapter.deleteObjects(bucket, body.keys);
  } else if (body.key) {
    await adapter.deleteObject(bucket, body.key);
  } else {
    return NextResponse.json({ error: "缺少 key 或 keys 参数" }, { status: 400 });
  }
  
  return NextResponse.json({ success: true }); } catch (e: unknown) { console.error(`[delete] Provider ${providerId} 错误:`, e);
  return NextResponse.json({ error: toErrorMessage(e) || "删除失败" }, { status: 500 }); }
}
