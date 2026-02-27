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
  const { bucket, oldKey, newKey } = await req.json();

  if (!bucket || !oldKey || !newKey) {
    return NextResponse.json({ error: "缺少必填参数" }, { status: 400 });
  }

  try { const adapter = await getStorageAdapter(providerId);
  
  // S3 没有原生的重命名操作，需要复制后删除
  await adapter.copyObject(bucket, oldKey, bucket, newKey);
  await adapter.deleteObject(bucket, oldKey);
  
  await logAudit({
    action: "FILE_RENAME",
    description: `重命名 ${oldKey} 为 ${newKey} (${bucket})`,
    userId: session.user.id,
    username: session.user.name || "unknown",
    providerId,
    bucket,
    req,
    metadata: { oldKey, newKey },
  });

  return NextResponse.json({ success: true }); } catch (e: unknown) { console.error(`[rename] Provider ${providerId} 错误:`, e);
  return NextResponse.json({ error: toErrorMessage(e) || "重命名失败" }, { status: 500 }); }
}
