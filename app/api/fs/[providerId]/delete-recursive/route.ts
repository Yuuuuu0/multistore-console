import { requireSession } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { getStorageAdapter } from "@/lib/storage";
import { toErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function DELETE(
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

  try {
    const adapter = await getStorageAdapter(providerId);

    // 递归列出 prefix 下所有对象（不使用 delimiter，平铺展开）
    const allKeys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const res = await adapter.listObjects(bucket, prefix, "", continuationToken);
      allKeys.push(...res.objects.map((o) => o.key));
      continuationToken = res.nextContinuationToken;
    } while (continuationToken);

    // 分离文件和文件夹标记（以 / 结尾的是文件夹标记）
    const fileKeys = allKeys.filter((k) => !k.endsWith("/"));
    const folderKeys = allKeys.filter((k) => k.endsWith("/"));

    // 确保目标 prefix 本身在文件夹列表中
    if (!folderKeys.includes(prefix)) {
      folderKeys.push(prefix);
    }

    // 文件夹按路径深度降序排列（先删深层，再删浅层）
    folderKeys.sort((a, b) => {
      const depthA = a.split("/").length;
      const depthB = b.split("/").length;
      return depthB - depthA;
    });

    // 第 1 步：先批量删除所有文件
    for (let i = 0; i < fileKeys.length; i += 1000) {
      const chunk = fileKeys.slice(i, i + 1000);
      await adapter.deleteObjects(bucket, chunk);
    }

    // 第 2 步：从最深层开始逐层批量删除文件夹标记
    // 使用 deleteObjects 保持与厂商兼容（某些厂商 deleteObject 对文件夹行为不同）
    for (let i = 0; i < folderKeys.length; i += 1000) {
      const chunk = folderKeys.slice(i, i + 1000);
      try {
        await adapter.deleteObjects(bucket, chunk);
      } catch {
        // 文件夹标记可能不存在（虚拟文件夹），忽略错误
      }
    }

    await logAudit({
      action: "FILE_DELETE_RECURSIVE",
      description: `递归删除文件夹 ${prefix} (${bucket})，共 ${fileKeys.length + folderKeys.length} 个对象`,
      userId: session.user.id,
      username: session.user.name || "unknown",
      providerId,
      bucket,
      req,
      metadata: { prefix, deletedCount: fileKeys.length + folderKeys.length },
    });

    return NextResponse.json({ success: true, deleted: fileKeys.length + folderKeys.length });
  } catch (e: unknown) {
    console.error(`[delete-recursive] Provider ${providerId} 错误:`, e);
    return NextResponse.json({ error: toErrorMessage(e) || "删除失败" }, { status: 500 });
  }
}
