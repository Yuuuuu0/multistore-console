import { prisma } from "@/lib/db";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const [githubClientId, admin] = await Promise.all([
    prisma.appConfig.findUnique({ where: { key: "github_client_id" } }),
    prisma.user.findUnique({ where: { username: "admin" } }),
  ]);

  return (
    <LoginForm
      hasGithub={!!githubClientId?.value}
      passwordLoginEnabled={admin?.passwordLoginEnabled ?? true}
    />
  );
}
