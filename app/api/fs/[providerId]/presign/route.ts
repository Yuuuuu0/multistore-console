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
  const key = searchParams.get("key");
  const download = searchParams.get("download") === "true";
  if (!bucket || !key) return NextResponse.json({ error: "缺少参数" }, { status: 400 });

  try { const adapter = await getStorageAdapter(providerId);
  const url = await adapter.getPresignedUrl(bucket, key, 3600, download);
  return NextResponse.json({ url }); } catch (e: unknown) { return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 }); }
}
