import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { checkEndpoint } from "@/lib/url-validator";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [, authError] = await requireSession();
  if (authError) return authError;

  const { id } = await params;
  const { name, type, accessKeyId, secretAccessKey, endpoint, region, forcePathStyle, disableChunked, buckets } =
    await req.json();

  if (endpoint) {
    const endpointError = checkEndpoint(endpoint);
    if (endpointError) return endpointError;
  }

  const data: Record<string, unknown> = { name, type, accessKeyId, endpoint, region };
  if (secretAccessKey) data.secretAccessKey = encrypt(secretAccessKey);
  if (typeof forcePathStyle === "boolean") data.forcePathStyle = forcePathStyle;
  if (typeof disableChunked === "boolean") data.disableChunked = disableChunked;

  // 更新 buckets
  if (Array.isArray(buckets)) {
    // 删除旧的 buckets
    await prisma.bucket.deleteMany({ where: { providerId: id } });
    // 创建新的 buckets
    await prisma.bucket.createMany({
      data: buckets.map((bucketName: string) => ({
        providerId: id,
        name: bucketName,
      })),
    });
  }

  await prisma.provider.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [, authError] = await requireSession();
  if (authError) return authError;

  const { id } = await params;
  await prisma.provider.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
