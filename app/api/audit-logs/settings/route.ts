import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

const CONFIG_KEY = "audit_log_retention_days";
const DEFAULT_DAYS = 30;

export async function GET() {
  const [, authError] = await requireSession();
  if (authError) return authError;

  const config = await prisma.appConfig.findUnique({ where: { key: CONFIG_KEY } });
  return NextResponse.json({ days: config ? parseInt(config.value, 10) : DEFAULT_DAYS });
}

export async function PUT(req: Request) {
  const [, authError] = await requireSession();
  if (authError) return authError;

  const body = await req.json();
  const days = Number(body.days);

  if (!Number.isInteger(days) || days < 1 || days > 365) {
    return NextResponse.json({ error: "保留天数必须为 1-365 的整数" }, { status: 400 });
  }

  await prisma.appConfig.upsert({
    where: { key: CONFIG_KEY },
    update: { value: String(days) },
    create: { key: CONFIG_KEY, value: String(days) },
  });

  return NextResponse.json({ days });
}
