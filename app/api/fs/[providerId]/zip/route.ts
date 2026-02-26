import { requireSession } from "@/lib/api-auth";
import { getStorageAdapter } from "@/lib/storage";
import { toErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";
import archiver from "archiver";
import { PassThrough } from "stream";

/** ZIP 下载最大文件数 */
const MAX_ZIP_FILES = 100;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const [, authError] = await requireSession();
  if (authError) return authError;

  const { providerId } = await params;
  const { bucket, keys } = await req.json();

  if (!bucket || !Array.isArray(keys) || keys.length === 0) {
    return NextResponse.json({ error: "缺少 bucket 或 keys 参数" }, { status: 400 });
  }

  if (keys.length > MAX_ZIP_FILES) {
    return NextResponse.json(
      { error: `ZIP 下载文件数超过限制（最多 ${MAX_ZIP_FILES} 个文件）` },
      { status: 400 }
    );
  }

  try { const adapter = await getStorageAdapter(providerId);
  
  const passthrough = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 5 } });
  
  archive.on("error", (err) => {
    passthrough.destroy(err);
  });
  
  archive.pipe(passthrough);
  
  // Add each file to archive
  for (const key of keys) {
    try {
      const stream = await adapter.getObject(bucket, key);
      const fileName = key.split("/").pop() || key;
      archive.append(stream, { name: fileName });
    } catch (e) {
      console.error(`[zip] 获取文件 ${key} 失败:`, e);
    }
  }
  
  archive.finalize();
  
  // Convert Node stream to Web ReadableStream
  const webStream = new ReadableStream({
    start(controller) {
      passthrough.on("data", (chunk) => controller.enqueue(chunk));
      passthrough.on("end", () => controller.close());
      passthrough.on("error", (err) => controller.error(err));
    },
  });
  
  return new Response(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="download-${Date.now()}.zip"`,
    },
  }); } catch (e: unknown) { console.error(`[zip] Provider ${providerId} 错误:`, e);
  return NextResponse.json({ error: toErrorMessage(e) || "打包下载失败" }, { status: 500 }); }
}
