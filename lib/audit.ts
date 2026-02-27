import { prisma } from "@/lib/db";

export type AuditAction =
  // 文件操作
  | "FILE_UPLOAD"
  | "FILE_DELETE"
  | "FILE_BATCH_DELETE"
  | "FILE_DELETE_RECURSIVE"
  | "FILE_RENAME"
  | "FILE_COPY"
  | "FILE_DOWNLOAD"
  | "FILE_ZIP_DOWNLOAD"
  | "FOLDER_CREATE"
  // 认证操作
  | "AUTH_LOGIN"
  | "AUTH_LOGOUT"
  | "AUTH_PASSWORD_CHANGE"
  // Provider 管理
  | "PROVIDER_CREATE"
  | "PROVIDER_UPDATE"
  | "PROVIDER_DELETE"
  | "PROVIDER_TEST_CONNECTION"
  // 跨云传输
  | "TRANSFER_CREATE"
  | "TRANSFER_CANCEL";

type LogAuditParams = {
  action: AuditAction;
  status?: "SUCCESS" | "FAILURE";
  description: string;
  userId: string;
  username: string;
  providerId?: string;
  providerName?: string;
  bucket?: string;
  req?: Request;
  metadata?: Record<string, unknown>;
};

function getClientIP(req?: Request): string {
  if (!req) return "unknown";
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    // 如果有 providerId 但没有 providerName，自动查找
    let providerName = params.providerName;
    if (params.providerId && !providerName) {
      const provider = await prisma.provider.findUnique({
        where: { id: params.providerId },
        select: { name: true },
      });
      providerName = provider?.name ?? undefined;
    }

    await prisma.auditLog.create({
      data: {
        action: params.action,
        status: params.status ?? "SUCCESS",
        description: params.description,
        userId: params.userId,
        username: params.username,
        providerId: params.providerId,
        providerName,
        bucket: params.bucket,
        ipAddress: getClientIP(params.req),
        userAgent: params.req?.headers.get("user-agent") ?? undefined,
        metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
      },
    });
  } catch (e) {
    console.error("[audit] 审计日志写入失败:", e);
  }
}
