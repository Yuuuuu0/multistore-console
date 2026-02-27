import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
let lastCleanupTime = 0;

function triggerCleanup() {
  const now = Date.now();
  if (now - lastCleanupTime < CLEANUP_INTERVAL) return;
  lastCleanupTime = now;

  (async () => {
    try {
      const config = await prisma.appConfig.findUnique({
        where: { key: "audit_log_retention_days" },
      });
      const days = config ? parseInt(config.value, 10) : 30;
      if (days < 1 || days > 365) return;

      const cutoff = new Date(Date.now() - days * 86400000);
      const result = await prisma.auditLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (result.count > 0) {
        console.log(`[audit-logs] 已清理 ${result.count} 条过期日志 (保留 ${days} 天)`);
      }
    } catch (e) {
      console.error("[audit-logs] 清理过期日志失败:", e);
    }
  })();
}

export async function GET(req: Request) {
  const [, authError] = await requireSession();
  if (authError) return authError;

  triggerCleanup();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10)));
  const action = searchParams.get("action") || undefined;
  const status = searchParams.get("status") || undefined;
  const providerId = searchParams.get("providerId") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (status) where.status = status;
  if (providerId) where.providerId = providerId;
  if (startDate || endDate) {
    const createdAt: Record<string, Date> = {};
    if (startDate) createdAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      createdAt.lte = end;
    }
    where.createdAt = createdAt;
  }

  try {
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (e) {
    console.error("[audit-logs] 查询失败:", e);
    return NextResponse.json({ error: "查询审计日志失败" }, { status: 500 });
  }
}
