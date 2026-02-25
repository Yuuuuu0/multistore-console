import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";
import { NextResponse } from "next/server";

// List all transfer tasks
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tasks = await prisma.transferTask.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(tasks);
}

// Create a new transfer task
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { srcProviderId, srcBucket, srcKey, dstProviderId, dstBucket, dstKey } = await req.json();

  if (!srcProviderId || !srcBucket || !srcKey || !dstProviderId || !dstBucket || !dstKey) {
    return NextResponse.json({ error: "缺少必填参数" }, { status: 400 });
  }

  const task = await prisma.transferTask.create({
    data: { srcProviderId, srcBucket, srcKey, dstProviderId, dstBucket, dstKey },
  });

  // Execute transfer in background (fire and forget)
  executeTransfer(task.id).catch((e) => {
    console.error(`[transfer] 任务 ${task.id} 执行失败:`, e);
  });

  return NextResponse.json(task);
}

async function executeTransfer(taskId: string) {
  try {
    await prisma.transferTask.update({
      where: { id: taskId },
      data: { status: "RUNNING", progress: 0 },
    });

    const task = await prisma.transferTask.findUnique({ where: { id: taskId } });
    if (!task) return;

    const srcAdapter = await getStorageAdapter(task.srcProviderId);
    const dstAdapter = await getStorageAdapter(task.dstProviderId);

    // Download from source
    await prisma.transferTask.update({
      where: { id: taskId },
      data: { progress: 20 },
    });

    const stream = await srcAdapter.getObject(task.srcBucket, task.srcKey);

    // Read into buffer (for simplicity; large files could use multipart)
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    await prisma.transferTask.update({
      where: { id: taskId },
      data: { progress: 60 },
    });

    // Upload to destination
    await dstAdapter.putObject(task.dstBucket, task.dstKey, buffer, buffer.length);

    await prisma.transferTask.update({
      where: { id: taskId },
      data: { status: "SUCCEEDED", progress: 100 },
    });
  } catch (e: any) {
    await prisma.transferTask.update({
      where: { id: taskId },
      data: { status: "FAILED", error: e.message || "传输失败" },
    });
  }
}
