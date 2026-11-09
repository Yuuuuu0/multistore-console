import { NextResponse } from "next/server";
import { requireProviderAccess } from "@/lib/api-auth";
import { getStorageAdapter } from "@/lib/storage";
import { corsFailure, inspectCors, mergeCorsRules, parseCorsOrigin } from "@/lib/storage/cors";
import type { CORSRule } from "@aws-sdk/client-s3";

type Context = { params: Promise<{ providerId: string }> };

/** 查询 origin 的桶 CORS 能力；读取失败时返回推荐配置，但不修改桶。 */
export async function GET(req: Request, { params }: Context) {
  const { providerId } = await params;
  const [, , authError] = await requireProviderAccess(providerId);
  if (authError) return authError;
  const search = new URL(req.url).searchParams;
  const bucket = search.get("bucket");
  const origin = parseCorsOrigin(search.get("origin"));
  if (!bucket || !origin) return NextResponse.json({ error: "需要 bucket 和合法的 http/https origin（不能包含路径、凭证或通配符）" }, { status: 400 });
  try {
    const adapter = await getStorageAdapter(providerId);
    return NextResponse.json(inspectCors(origin, await adapter.getBucketCors(bucket)));
  } catch (error) {
    const failure = corsFailure(error);
    return NextResponse.json({ ...inspectCors(origin, []), compatible: false, issues: [failure.message], error: failure.message }, { status: failure.status });
  }
}

/** 显式请求时先读取并合并精确 origin 规则；读写失败不覆盖或声称成功。 */
export async function PUT(req: Request, { params }: Context) {
  const { providerId } = await params;
  const [, , authError] = await requireProviderAccess(providerId);
  if (authError) return authError;
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "无效 JSON" }, { status: 400 }); }
  const origin = parseCorsOrigin(body?.origin);
  const bucket = body?.bucket;
  if (typeof bucket !== "string" || !bucket || !origin) return NextResponse.json({ error: "需要 bucket 和合法的 http/https origin（不能包含路径、凭证或通配符）" }, { status: 400 });
  let rules: CORSRule[] = [];
  let written = false;
  try {
    const adapter = await getStorageAdapter(providerId);
    rules = await adapter.getBucketCors(bucket);
    const merged = mergeCorsRules(origin, rules);
    if (merged !== rules) {
      await adapter.putBucketCors(bucket, merged);
      written = true;
      rules = await adapter.getBucketCors(bucket);
    }
    const result = inspectCors(origin, rules);
    if (!result.compatible) return NextResponse.json({ ...result, error: "云端返回的 CORS 规则仍不兼容，请在云控制台核对配置" }, { status: 502 });
    return NextResponse.json(result);
  } catch (error) {
    const failure = corsFailure(error);
    const message = written ? `写入已被云端接受，但回读确认失败，请刷新或在云控制台核对。${failure.message}` : failure.message;
    return NextResponse.json({ ...inspectCors(origin, rules), compatible: false, issues: [message], error: message }, { status: failure.status });
  }
}
