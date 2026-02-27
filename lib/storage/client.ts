import { S3Client } from "@aws-sdk/client-s3";
import { createHash } from "crypto";
import { decrypt } from "@/lib/crypto";

export type ProviderConfig = {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string | null;
  region?: string | null;
  forcePathStyle?: boolean | null;
  disableChunked?: boolean | null;
};

export function createS3Client(config: ProviderConfig): S3Client {
  // 对于 OSS，尝试从 endpoint 提取 region
  let region = config.region || "us-east-1";
  if (!config.region && config.endpoint) {
    // 匹配 OSS endpoint 格式：https://oss-cn-beijing.aliyuncs.com 或 https://oss-ap-southeast-1.aliyuncs.com
    const ossRegionMatch = config.endpoint.match(/oss-([a-z0-9-]+)\.aliyuncs/);
    if (ossRegionMatch) {
      region = ossRegionMatch[1]; // 例如：cn-beijing, ap-southeast-1
    }
  }

  const client = new S3Client({
    region,
    endpoint: config.endpoint || undefined,
    forcePathStyle: config.forcePathStyle ?? !!config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: decrypt(config.secretAccessKey),
    },
  });

  // 为带 body 的请求自动添加 Content-MD5（OSS 等厂商对 DeleteObjects 强制要求）
  client.middlewareStack.add(
    (next) => async (args) => {
      const req = args.request as { body?: string | Uint8Array; headers?: Record<string, string> };
      if (req?.body && req.headers && !req.headers["content-md5"]) {
        const body = typeof req.body === "string" ? Buffer.from(req.body) : req.body;
        req.headers["content-md5"] = createHash("md5").update(body).digest("base64");
      }
      return next(args);
    },
    { step: "finalizeRequest", name: "addContentMD5" }
  );

  // 部分 S3 兼容厂商（如 OSS）不支持 aws-chunked；通过 guard 防止误发该类请求
  if (config.disableChunked) {
    client.middlewareStack.add(
      (next) => async (args) => {
        const req = args.request as any;
        const encoding = req?.headers?.["content-encoding"];
        if (typeof encoding === "string" && encoding.includes("aws-chunked")) {
          throw new Error("当前 Provider 禁用 aws-chunked：请使用 presigned PUT 或 multipart 上传");
        }
        return next(args);
      },
      { step: "finalizeRequest", name: "disableChunkedGuard" }
    );
  }

  return client;
}
