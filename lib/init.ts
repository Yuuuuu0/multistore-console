import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

const ADMIN_USERNAME = "admin";
const INIT_FLAG_KEY = "initialized";

export async function ensureInitialized() {
  // Skip during build time
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  const flag = await prisma.appConfig.findUnique({ where: { key: INIT_FLAG_KEY } });
  if (flag) return;

  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const password = Array.from({ length: 12 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.create({
      data: {
        username: ADMIN_USERNAME,
        passwordHash,
        requirePasswordChange: true,
        passwordLoginEnabled: true,
      },
    }),
    prisma.appConfig.create({ data: { key: INIT_FLAG_KEY, value: "true" } }),
  ]);

  console.log("┌─────────────────────────────────────────────┐");
  console.log("│         MultiStore Console 首次启动           │");
  console.log(`│  用户名: ${"admin".padEnd(34)}│`);
  console.log(`│  密  码: ${password.padEnd(34)}│`);
  console.log("│  请登录后立即修改密码或绑定 GitHub SSO          │");
  console.log("└─────────────────────────────────────────────┘");
}
