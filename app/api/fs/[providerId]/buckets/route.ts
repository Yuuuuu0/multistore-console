import { auth } from "@/lib/auth";
import { getStorageAdapter } from "@/lib/storage";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ providerId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { providerId } = await params;
  try {
    const adapter = await getStorageAdapter(providerId);
    const buckets = await adapter.listBuckets();
    return NextResponse.json({ buckets });
  } catch (e: any) {
    console.error(`[buckets] Provider ${providerId} 错误:`, e);
    return NextResponse.json({ error: e.message || "加载存储桶失败" }, { status: 500 });
  }
}
