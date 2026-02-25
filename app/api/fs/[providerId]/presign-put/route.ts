import { auth } from "@/lib/auth";
import { getStorageAdapter } from "@/lib/storage";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ providerId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { providerId } = await params;
  const { searchParams } = new URL(req.url);
  const bucket = searchParams.get("bucket");
  const key = searchParams.get("key");
  const contentType = searchParams.get("contentType") ?? undefined;
  if (!bucket || !key) return NextResponse.json({ error: "缺少参数" }, { status: 400 });

  try {
    const adapter = await getStorageAdapter(providerId);
    const url = await adapter.getPresignedPutUrl(bucket, key, { expiresIn: 900, contentType });
    return NextResponse.json({ url, method: "PUT", headers: contentType ? { "Content-Type": contentType } : {} });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
