import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
