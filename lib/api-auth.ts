import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

import type { Session } from "next-auth";

/**
 * 认证相关错误响应
 */
function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden(message = "无权访问该资源") {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * 要求已认证的 Session，否则返回 401
 * 使用方式：
 * ```
 * const [session, errorResponse] = await requireSession();
 * if (errorResponse) return errorResponse;
 * // session 此时是 Session 类型
 * ```
 */
export async function requireSession(): Promise<
  [Session, null] | [null, NextResponse]
> {
  const session = await auth();
  if (!session) {
    return [null, unauthorized()];
  }
  return [session, null];
}

/**
 * 要求已认证且拥有指定 Provider 的访问权限
 * 返回 [session, provider] 或 [null, null, errorResponse]
 * 使用方式：
 * ```
 * const [session, provider, errorResponse] = await requireProviderAccess(providerId);
 * if (errorResponse) return errorResponse;
 * ```
 */
export async function requireProviderAccess(
  providerId: string
): Promise<
  | [Session, { id: string; userId?: string; [key: string]: unknown }, null]
  | [null, null, NextResponse]
> {
  const [session, authError] = await requireSession();
  if (authError) return [null, null, authError];

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
  });

  if (!provider) {
    return [null, null, NextResponse.json({ error: "Provider 不存在" }, { status: 404 })];
  }

  if (
    "userId" in provider &&
    typeof provider.userId === "string" &&
    provider.userId !== session.user?.id
  ) {
    return [null, null, forbidden()];
  }

  return [session, provider as { id: string; userId?: string; [key: string]: unknown }, null];
}
