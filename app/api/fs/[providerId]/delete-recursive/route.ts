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
  const { bucket, prefix } = await req.json();

  if (!bucket || !prefix) {
    return NextResponse.json({ error: "缺少必填参数" }, { status: 400 });
  }

  try {
    const adapter = await getStorageAdapter(providerId);

    // List all objects under the prefix recursively (no delimiter)
    let allKeys: string[] = [];
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

    return NextResponse.json({ success: true, deleted: allKeys.length });
  } catch (e: any) {
    console.error(`[delete-recursive] Provider ${providerId} 错误:`, e);
    return NextResponse.json({ error: e.message || "删除失败" }, { status: 500 });
  }
}
