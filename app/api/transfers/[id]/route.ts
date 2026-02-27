import { requireSession } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// DELETE /api/transfers/:id
// QUEUED/RUNNING -> 标记为 CANCELLED
// SUCCEEDED/FAILED/CANCELLED -> 物理删除
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [session, authError] = await requireSession();
  if (authError) return authError;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "缺少任务 ID" }, { status: 400 });
  }

  const task = await prisma.transferTask.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!task) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  if (task.status === "QUEUED" || task.status === "RUNNING") {
    const updated = await prisma.transferTask.update({
      where: { id },
      data: { status: "CANCELLED", error: "用户取消任务" },
    });
    await logAudit({
      action: "TRANSFER_CANCEL",
      description: `取消传输任务 ${id}`,
      userId: session.user.id,
      username: session.user.name || "unknown",
      req,
      metadata: { taskId: id },
    });
    return NextResponse.json({ action: "cancelled", data: updated });
  }

  await prisma.transferTask.delete({ where: { id } });
  return NextResponse.json({ action: "deleted", data: { id } });
}
