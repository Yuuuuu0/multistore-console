import { requireSession } from "@/lib/api-auth";
import { getStorageAdapter } from "@/lib/storage";
import { toErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ providerId: string }> }) {
  const [, authError] = await requireSession();
  if (authError) return authError;

  const { providerId } = await params;
  const { searchParams } = new URL(req.url);
  const bucket = searchParams.get("bucket");
  const prefix = searchParams.get("prefix") ?? "";
  const continuationToken = searchParams.get("continuationToken") || undefined;
  if (!bucket) return NextResponse.json({ error: "缺少 bucket 参数" }, { status: 400 });

  try { const adapter = await getStorageAdapter(providerId);
  const result = await adapter.listObjects(bucket, prefix, "/", continuationToken);
  return NextResponse.json(result); } catch (e: unknown) { return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 }); }
}
