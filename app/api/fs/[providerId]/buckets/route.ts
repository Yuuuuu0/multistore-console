import { requireSession } from "@/lib/api-auth";
import { getStorageAdapter } from "@/lib/storage";
import { toErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ providerId: string }> }) {
  const [, authError] = await requireSession();
  if (authError) return authError;

  const { providerId } = await params;
  try { const adapter = await getStorageAdapter(providerId);
  const buckets = await adapter.listBuckets();
  return NextResponse.json({ buckets }); } catch (e: unknown) { console.error(`[buckets] Provider ${providerId} 错误:`, e);
  return NextResponse.json({ error: toErrorMessage(e) || "加载存储桶失败" }, { status: 500 }); }
}
