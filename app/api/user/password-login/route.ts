import { requireSession } from "@/lib/api-auth";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  const [session, authError] = await requireSession();
  if (authError) return authError;

  const limited = checkRateLimit(req, "password-login", RATE_LIMIT_PRESETS.sensitive);
  if (limited) return limited;

  const { enabled } = await req.json();
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  // 关闭密码登录前必须已绑定 GitHub
  if (!enabled && !user.githubId) {
    return NextResponse.json({ error: "请先绑定 GitHub 再关闭密码登录" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordLoginEnabled: enabled },
  });

  return NextResponse.json({ ok: true });
}
