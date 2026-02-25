import { auth } from "@/lib/auth";
import { getStorageAdapter } from "@/lib/storage";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ providerId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { providerId } = await params;
  const { searchParams } = new URL(req.url);
  const bucket = searchParams.get("bucket");
  const prefix = searchParams.get("prefix") ?? "";
  const continuationToken = searchParams.get("continuationToken") || undefined;
  if (!bucket) return NextResponse.json({ error: "缺少 bucket 参数" }, { status: 400 });

  try {
    const adapter = await getStorageAdapter(providerId);
    const result = await adapter.listObjects(bucket, prefix, "/", continuationToken);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
