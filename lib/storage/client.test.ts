// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { createHash } from "crypto";
import { createS3Client } from "./client";
import { StorageAdapter } from "./adapter";

vi.mock("@/lib/crypto", () => ({ decrypt: (value: string) => value }));
const credentials = { accessKeyId: "test-key", secretAccessKey: "test-secret" };

describe("S3 兼容浏览器签名", () => {
  it.each([
    { endpoint: undefined, region: "us-east-1", forcePathStyle: false, host: "bucket.s3.us-east-1.amazonaws.com" },
    { endpoint: "https://oss-cn-beijing.aliyuncs.com", forcePathStyle: false, host: "bucket.oss-cn-beijing.aliyuncs.com" },
    { endpoint: "https://cos.ap-guangzhou.myqcloud.com", region: "ap-guangzhou", forcePathStyle: false, host: "bucket.cos.ap-guangzhou.myqcloud.com" },
    { endpoint: "https://storage.example.com", forcePathStyle: true, host: "storage.example.com" },
  ])("按已存地址方式签名 $host，不为未知内容签空 checksum", async (config) => {
    const client = createS3Client({ ...credentials, ...config });
    const adapter = new StorageAdapter(client);
    try {
      const url = new URL(await adapter.getPresignedPutUrl("bucket", "目录/file.txt", { contentType: "text/plain" }));
      expect(url.host).toBe(config.host);
      expect(url.searchParams.get("X-Amz-SignedHeaders")?.split(";")).toEqual(expect.arrayContaining(["host", "content-type"]));
      expect([...url.searchParams.keys()].some((k) => /checksum|sdk-checksum/i.test(k))).toBe(false);
      expect(url.searchParams.get("X-Amz-Content-Sha256")).toBe("UNSIGNED-PAYLOAD");
      expect(await client.config.requestChecksumCalculation()).toBe("WHEN_REQUIRED");
      const partUrl = new URL(await adapter.getPresignedUploadPartUrl("bucket", "file", "upload-id", 1));
      expect([...partUrl.searchParams.keys()].some((k) => /checksum|sdk-checksum/i.test(k))).toBe(false);
      expect(partUrl.searchParams.get("partNumber")).toBe("1");
    } finally { client.destroy(); }
  });

  it("保留显式 path-style 和 region，不迁移现有 provider 配置", async () => {
    const client = createS3Client({ ...credentials, endpoint: "https://oss-cn-beijing.aliyuncs.com", forcePathStyle: true, region: "custom-region" });
    try {
      const url = new URL(await new StorageAdapter(client).getPresignedPutUrl("bucket", "file"));
      expect(url.host).toBe("oss-cn-beijing.aliyuncs.com");
      expect(url.pathname).toBe("/bucket/file");
      expect(url.searchParams.get("X-Amz-Credential")).toContain("/custom-region/s3/");
    } finally { client.destroy(); }
  });

  it("XML 控制面仍计算 MD5 且在签名前添加", async () => {
    const client = createS3Client(credentials);
    let headers: Record<string, string> = {};
    client.middlewareStack.add(() => async (args) => {
      const request = args.request as { headers: Record<string, string>; body: string };
      headers = request.headers;
      expect(headers["content-md5"]).toBe(createHash("md5").update(request.body).digest("base64"));
      return { response: {}, output: { $metadata: {} } };
    }, { step: "finalizeRequest", priority: "low", name: "captureSignedRequest" });
    try {
      await client.send(new DeleteObjectsCommand({ Bucket: "bucket", Delete: { Objects: [{ Key: "file" }] } }));
      expect(headers.authorization).toContain("content-md5");
    } finally { client.destroy(); }
  });
});
