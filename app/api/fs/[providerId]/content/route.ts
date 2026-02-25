import { auth } from "@/lib/auth";
import { getStorageAdapter } from "@/lib/storage";
import { NextResponse } from "next/server";

const MAX_PREVIEW_SIZE = 512 * 1024; // 512KB max for text preview

export async function GET(
  req: Request,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { providerId } = await params;
  const { searchParams } = new URL(req.url);
  const bucket = searchParams.get("bucket");
  const key = searchParams.get("key");

  if (!bucket || !key) {
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }

  try {
    const adapter = await getStorageAdapter(providerId);

    // Check file size first
    const head = await adapter.headObject(bucket, key);
    const size = head.ContentLength ?? 0;
    if (size > MAX_PREVIEW_SIZE) {
      return NextResponse.json({ error: "文件过大，无法预览", size }, { status: 413 });
    }

    const stream = await adapter.getObject(bucket, key);

    // Read stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    const content = buffer.toString("utf-8");

    return NextResponse.json({ content, size });
  } catch (e: any) {
    console.error(`[content] Provider ${providerId} 错误:`, e);
    return NextResponse.json({ error: e.message || "获取内容失败" }, { status: 500 });
  }
}
