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
  const { searchParams } = new URL(req.url);
  const bucket = searchParams.get("bucket");
  const key = searchParams.get("key");

  if (!bucket || !key) {
    return NextResponse.json({ error: "缺少 bucket 或 key 参数" }, { status: 400 });
  }

  try {
    const adapter = await getStorageAdapter(providerId);
    const body = req.body;
    if (!body) {
      return NextResponse.json({ error: "缺少文件内容" }, { status: 400 });
    }

    // Read the stream into a buffer for S3 SDK compatibility
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const buffer = Buffer.concat(chunks);

    await adapter.putObject(bucket, key, buffer, buffer.length);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(`[upload] Provider ${providerId} 错误:`, e);
    return NextResponse.json({ error: e.message || "上传失败" }, { status: 500 });
  }
}
