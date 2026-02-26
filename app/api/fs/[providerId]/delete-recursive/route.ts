import { requireSession } from "@/lib/api-auth";
import { getStorageAdapter } from "@/lib/storage";
import { toErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const [, authError] = await requireSession();
  if (authError) return authError;

  const { providerId } = await params;
  const { bucket, prefix } = await req.json();

  if (!bucket || !prefix) {
    return NextResponse.json({ error: "缺少必填参数" }, { status: 400 });
  }

  try { const adapter = await getStorageAdapter(providerId);
  
  // List all objects under the prefix recursively (no delimiter)
  const allKeys: string[] = [];
  let continuationToken: string | undefined;
  
  do {
    const res = await adapter.listObjects(bucket, prefix, "", continuationToken);
    allKeys.push(...res.objects.map((o) => o.key));
    continuationToken = res.nextContinuationToken;
  } while (continuationToken);
  
  // Also include the prefix itself (folder marker)
  allKeys.push(prefix);
  
  // Batch delete in chunks of 1000 (S3 limit)
  for (let i = 0; i < allKeys.length; i += 1000) {
    const chunk = allKeys.slice(i, i + 1000);
    await adapter.deleteObjects(bucket, chunk);
  }
  
  return NextResponse.json({ success: true, deleted: allKeys.length }); } catch (e: unknown) { console.error(`[delete-recursive] Provider ${providerId} 错误:`, e);
  return NextResponse.json({ error: toErrorMessage(e) || "删除失败" }, { status: 500 }); }
}
