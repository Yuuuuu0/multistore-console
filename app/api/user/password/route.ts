import { requireSession } from "@/lib/api-auth";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

/** 密码复杂度校验：至少8位，包含大写、小写、数字 */
function validatePasswordComplexity(password: string): string | null {
  if (password.length < 8) return "密码长度至少为 8 位";
  if (!/[A-Z]/.test(password)) return "密码必须包含至少一个大写字母";
  if (!/[a-z]/.test(password)) return "密码必须包含至少一个小写字母";
  if (!/[0-9]/.test(password)) return "密码必须包含至少一个数字";
  return null;
}

export async function PUT(req: Request) {
  const [session, authError] = await requireSession();
  if (authError) return authError;

  const limited = checkRateLimit(req, "password-change", RATE_LIMIT_PRESETS.sensitive);
  if (limited) return limited;

  const { currentPassword, newPassword } = await req.json();
  if (!newPassword) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  if (user.passwordHash) {
    if (!currentPassword) {
      return NextResponse.json({ error: "请输入当前密码" }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "当前密码不正确" }, { status: 400 });
    }
  }

  const complexityError = validatePasswordComplexity(newPassword);
  if (complexityError) {
    return NextResponse.json({ error: complexityError }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, requirePasswordChange: false },
  });

  return NextResponse.json({ ok: true });
}
