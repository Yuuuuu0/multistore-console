import { NextResponse } from "next/server";
import { requireProviderAccess } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { getStorageAdapter } from "@/lib/storage";
import { toErrorMessage } from "@/lib/errors";

/** 只接收对象标识和大小，HEAD 校验直传结果后记录 FILE_UPLOAD，不接收文件字节。 */
export async function POST(req: Request, { params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;
  const [session, , authError] = await requireProviderAccess(providerId);
  if (authError) return authError;
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "无效 JSON" }, { status: 400 }); }
  const { bucket, key, fileSize } = body ?? {};
  if (typeof bucket !== "string" || !bucket || typeof key !== "string" || !key || !Number.isSafeInteger(fileSize) || fileSize < 0) {
    return NextResponse.json({ error: "需要 bucket、key 和有效的 fileSize" }, { status: 400 });
  }
  try {
    const adapter = await getStorageAdapter(providerId);
    const object = await adapter.headObject(bucket, key);
    if (object.ContentLength !== fileSize) {
      return NextResponse.json({ error: "对象大小与上传文件不一致，请刷新列表核对；不会自动重新上传" }, { status: 409 });
    }
    await logAudit({
      action: "FILE_UPLOAD", description: `直传文件 ${key} 到 ${bucket}`,
      userId: session.user.id, username: session.user.name || "unknown", providerId, bucket, req,
      metadata: { fileSize, uploadType: "direct" },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: `对象存储 PUT 已成功，但完成确认失败：${toErrorMessage(error)}。HEAD 校验需要对象读取权限（仅 PutObject 权限不足），请刷新列表或在云控制台核对；不会自动重新上传。` }, { status: 502 });
  }
}
