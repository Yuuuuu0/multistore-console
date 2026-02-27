import { requireSession } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";
import { toErrorMessage } from "@/lib/errors";
import { S3Client } from "@aws-sdk/client-s3";
import { StorageAdapter } from "@/lib/storage/adapter";
import { checkEndpoint } from "@/lib/url-validator";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const [session, authError] = await requireSession();
  if (authError) return authError;

  const limited = checkRateLimit(req, "test-connection", RATE_LIMIT_PRESETS.sensitive);
  if (limited) return limited;

  try { const { type, accessKeyId, secretAccessKey, endpoint, region } = await req.json();
  
  if (endpoint) {
    const endpointError = checkEndpoint(endpoint);
    if (endpointError) return endpointError;
  }
  
  if (!accessKeyId || !secretAccessKey) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }
  
  // 对于 OSS，尝试从 endpoint 提取 region
  let finalRegion = region || "us-east-1";
  if (!region && endpoint) {
    const ossRegionMatch = endpoint.match(/oss-([a-z0-9-]+)\.aliyuncs/);
    if (ossRegionMatch) {
      finalRegion = ossRegionMatch[1];
    }
  }
  
  // 创建临时客户端测试连接（使用明文密钥）
  const client = new S3Client({
    region: finalRegion,
    endpoint: endpoint || undefined,
    forcePathStyle: type === "cos" || type === "oss" ? false : !!endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey, // 明文密钥
    },
  });
  
  // 添加 disableChunked 中间件
  if (type === "oss") {
    client.middlewareStack.add(
      (next) => async (args) => {
        const req = args.request as any;
        const encoding = req?.headers?.["content-encoding"];
        if (typeof encoding === "string" && encoding.includes("aws-chunked")) {
          throw new Error("当前 Provider 禁用 aws-chunked");
        }
        return next(args);
      },
      { step: "finalizeRequest", name: "disableChunkedGuard" }
    );
  }
  
  const adapter = new StorageAdapter(client);
  const buckets = await adapter.listBuckets();
  
  await logAudit({
    action: "PROVIDER_TEST_CONNECTION",
    description: `测试连接 (${type}, ${endpoint || 'default'})`,
    userId: session.user.id,
    username: session.user.name || "unknown",
    req,
    metadata: { type, endpoint },
  });

  return NextResponse.json({ buckets }); } catch (e: unknown) { console.error("[test-connection] 错误:", e);
  return NextResponse.json({ error: toErrorMessage(e) || "连接测试失败" }, { status: 500 }); }
}
