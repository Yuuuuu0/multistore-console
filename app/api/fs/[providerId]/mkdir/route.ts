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
  const { bucket, prefix } = await req.json();

  if (!bucket || !prefix) {
    return NextResponse.json({ error: "缺少必填参数" }, { status: 400 });
  }

  // Ensure folder key ends with /
  const folderKey = prefix.endsWith("/") ? prefix : prefix + "/";

  try { const adapter = await getStorageAdapter(providerId);
  // Create empty object with trailing slash as folder marker
  await adapter.putObject(bucket, folderKey, Buffer.from(""), 0);
  await logAudit({
    action: "FOLDER_CREATE",
    description: `创建文件夹 ${folderKey} (${bucket})`,
    userId: session.user.id,
    username: session.user.name || "unknown",
    providerId,
    bucket,
    req,
  });

  return NextResponse.json({ success: true }); } catch (e: unknown) { console.error(`[mkdir] Provider ${providerId} 错误:`, e);
  return NextResponse.json({ error: toErrorMessage(e) || "创建文件夹失败" }, { status: 500 }); }
}
