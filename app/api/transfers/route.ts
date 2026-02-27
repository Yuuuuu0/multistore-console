import { requireSession } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";
import { toErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";
import { Prisma, TransferTaskStatus } from "@prisma/client";

const DEFAULT_TAKE = 50;
const MAX_TAKE = 200;

function parseTake(value: string | null): number {
  if (!value) return DEFAULT_TAKE;
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n <= 0) return DEFAULT_TAKE;
  return Math.min(n, MAX_TAKE);
}

function parseStatus(value: string | null): TransferTaskStatus | null {
  if (!value || value === "ALL") return null;
  const statuses = Object.values(TransferTaskStatus);
  if (statuses.includes(value as TransferTaskStatus)) {
    return value as TransferTaskStatus;
  }
  return null;
}

// GET /api/transfers?status=RUNNING&take=100
export async function GET(req: Request) {
  const [, authError] = await requireSession();
  if (authError) return authError;

  const limited = checkRateLimit(req, "transfers-read", RATE_LIMIT_PRESETS.transferRead);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const take = parseTake(searchParams.get("take"));
  const status = parseStatus(searchParams.get("status"));
  const where: Prisma.TransferTaskWhereInput = status ? { status } : {};

  const tasks = await prisma.transferTask.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
  });

  const hasMore = tasks.length > take;
  const items = hasMore ? tasks.slice(0, take) : tasks;

  return NextResponse.json({
    items,
    pagination: { take, hasMore },
    filters: { status: status ?? "ALL" },
  });
}

// POST /api/transfers
export async function POST(req: Request) {
  const [session, authError] = await requireSession();
  if (authError) return authError;

  const body = await req.json();
  const srcProviderId = typeof body.srcProviderId === "string" ? body.srcProviderId.trim() : "";
  const srcBucket = typeof body.srcBucket === "string" ? body.srcBucket.trim() : "";
  const srcKey = typeof body.srcKey === "string" ? body.srcKey.trim() : "";
  const dstProviderId = typeof body.dstProviderId === "string" ? body.dstProviderId.trim() : "";
  const dstBucket = typeof body.dstBucket === "string" ? body.dstBucket.trim() : "";
  const dstKey = typeof body.dstKey === "string" ? body.dstKey.trim() : "";

  if (!srcProviderId || !srcBucket || !srcKey || !dstProviderId || !dstBucket || !dstKey) {
    return NextResponse.json({ error: "缺少必填参数" }, { status: 400 });
  }
  if (srcProviderId === dstProviderId && srcBucket === dstBucket && srcKey === dstKey) {
    return NextResponse.json({ error: "源与目标不能完全相同" }, { status: 400 });
  }

  const task = await prisma.transferTask.create({
    data: { srcProviderId, srcBucket, srcKey, dstProviderId, dstBucket, dstKey },
  });

  executeTransfer(task.id).catch((e) => {
    console.error(`[transfer] 任务 ${task.id} 执行失败:`, e);
  });

  await logAudit({
    action: "TRANSFER_CREATE",
    description: `创建传输任务: ${srcBucket}/${srcKey} -> ${dstBucket}/${dstKey}`,
    userId: session.user.id,
    username: session.user.name || "unknown",
    providerId: srcProviderId,
    bucket: srcBucket,
    req,
    metadata: { taskId: task.id, dstProviderId, dstBucket, dstKey },
  });

  return NextResponse.json(task);
}

async function executeTransfer(taskId: string) {
  try {
    const current = await prisma.transferTask.findUnique({ where: { id: taskId } });
    if (!current || current.status === "CANCELLED") return;

    await prisma.transferTask.update({
      where: { id: taskId },
      data: { status: "RUNNING", progress: 0, error: null },
    });

    const task = await prisma.transferTask.findUnique({ where: { id: taskId } });
    if (!task || task.status === "CANCELLED") return;

    const srcAdapter = await getStorageAdapter(task.srcProviderId);
    const dstAdapter = await getStorageAdapter(task.dstProviderId);

    await prisma.transferTask.update({
      where: { id: taskId },
      data: { progress: 20 },
    });

    const stream = await srcAdapter.getObject(task.srcBucket, task.srcKey);

    const beforeUpload = await prisma.transferTask.findUnique({
      where: { id: taskId },
      select: { status: true },
    });
    if (!beforeUpload || beforeUpload.status === "CANCELLED") return;

    await prisma.transferTask.update({
      where: { id: taskId },
      data: { progress: 60 },
    });

    await dstAdapter.putObject(task.dstBucket, task.dstKey, stream);

    await prisma.transferTask.update({
      where: { id: taskId },
      data: { status: "SUCCEEDED", progress: 100, error: null },
    });
  } catch (e: unknown) {
    await prisma.transferTask.update({
      where: { id: taskId },
      data: { status: "FAILED", error: toErrorMessage(e) || "传输失败" },
    });
  }
}
