import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const providers = await prisma.provider.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      accessKeyId: true,
      endpoint: true,
      region: true,
      forcePathStyle: true,
      disableChunked: true,
      createdAt: true,
      buckets: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  return NextResponse.json(providers);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, type, accessKeyId, secretAccessKey, endpoint, region, forcePathStyle, disableChunked, buckets } =
    await req.json();
  if (!name || !type || !accessKeyId || !secretAccessKey) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }

  const computedForcePathStyle =
    typeof forcePathStyle === "boolean"
      ? forcePathStyle
      : type === "cos" || type === "oss"
        ? false
        : !!endpoint;
  const computedDisableChunked = typeof disableChunked === "boolean" ? disableChunked : type === "oss";

  const provider = await prisma.provider.create({
    data: {
      name,
      type,
      accessKeyId,
      secretAccessKey: encrypt(secretAccessKey),
      endpoint,
      region,
      forcePathStyle: computedForcePathStyle,
      disableChunked: computedDisableChunked,
      buckets: {
        create: (buckets || []).map((bucketName: string) => ({
          name: bucketName,
        })),
      },
    },
  });
  return NextResponse.json({ id: provider.id, name: provider.name });
}
