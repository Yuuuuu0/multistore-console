// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetBucketCorsCommand, PutBucketCorsCommand, type S3Client } from "@aws-sdk/client-s3";
import { StorageAdapter } from "./adapter";

const send = vi.fn();
const adapter = new StorageAdapter({ send } as unknown as S3Client);
beforeEach(() => send.mockReset());

describe("S3 CORS 适配器", () => {
  it("仅明确 NoSuchCORSConfiguration 转换为空规则", async () => {
    send.mockRejectedValueOnce(Object.assign(new Error("no config"), { name: "NoSuchCORSConfiguration" }));
    expect(await adapter.getBucketCors("bucket")).toEqual([]);
    expect(send.mock.calls[0][0]).toBeInstanceOf(GetBucketCorsCommand);
  });
  it.each(["AccessDenied", "NoSuchBucket", "NotImplemented", "SignatureDoesNotMatch"])("%s 原样向上传递，禁止误认为空配置", async (name) => {
    const error = Object.assign(new Error(name), { name });
    send.mockRejectedValueOnce(error);
    await expect(adapter.getBucketCors("bucket")).rejects.toBe(error);
  });
  it("写入完整规则集，不吞云端异常", async () => {
    send.mockResolvedValueOnce({});
    const rules = [{ AllowedOrigins: ["https://console.example"], AllowedMethods: ["PUT"], ExposeHeaders: ["ETag"] }];
    await adapter.putBucketCors("bucket", rules);
    expect(send.mock.calls[0][0]).toBeInstanceOf(PutBucketCorsCommand);
    expect(send.mock.calls[0][0].input).toEqual({ Bucket: "bucket", CORSConfiguration: { CORSRules: rules } });
  });
});
