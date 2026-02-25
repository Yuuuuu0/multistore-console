import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";
import { NextResponse } from "next/server";

// 设置 GitHub 白名单用户名 + OAuth 凭证
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Save OAuth credentials
  if (body.clientId !== undefined && body.clientSecret !== undefined) {
    if (body.clientId && body.clientSecret) {
      await prisma.appConfig.upsert({
        where: { key: "github_client_id" },
        create: { key: "github_client_id", value: body.clientId },
        update: { value: body.clientId },
      });
      await prisma.appConfig.upsert({
        where: { key: "github_client_secret" },
        create: { key: "github_client_secret", value: encrypt(body.clientSecret) },
        update: { value: encrypt(body.clientSecret) },
      });
    } else {
      // Clear OAuth config
      await prisma.appConfig.deleteMany({
        where: { key: { in: ["github_client_id", "github_client_secret"] } },
      });
    }
    return NextResponse.json({ ok: true });
  }

  // Save whitelist
  const { githubUsername } = body;
  if (!githubUsername) return NextResponse.json({ error: "缺少 githubUsername" }, { status: 400 });

  await prisma.appConfig.upsert({
    where: { key: "github_whitelist" },
    create: { key: "github_whitelist", value: githubUsername },
    update: { value: githubUsername },
  });

  return NextResponse.json({ ok: true });
}

// 解绑 GitHub
export async function DELETE() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } });
  if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  if (!user.passwordLoginEnabled) {
    return NextResponse.json({ error: "请先启用密码登录再解绑 GitHub" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { githubId: null, githubUsername: null },
  });

  return NextResponse.json({ ok: true });
}
