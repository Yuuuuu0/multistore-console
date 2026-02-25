import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: {
      id: true,
      username: true,
      githubId: true,
      githubUsername: true,
      passwordLoginEnabled: true,
    },
  });

  if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  const [githubWhitelist, githubClientId] = await Promise.all([
    prisma.appConfig.findUnique({ where: { key: "github_whitelist" } }),
    prisma.appConfig.findUnique({ where: { key: "github_client_id" } }),
  ]);

  return NextResponse.json({
    ...user,
    githubWhitelist: githubWhitelist?.value || null,
    githubOAuthConfigured: !!githubClientId?.value,
    githubClientId: githubClientId?.value || "",
  });
}
