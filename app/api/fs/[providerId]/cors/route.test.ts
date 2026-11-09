// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireProviderAccess } from "@/lib/api-auth";
import { getStorageAdapter } from "@/lib/storage";
import { GET, PUT } from "./route";
import { recommendedCorsRule } from "@/lib/storage/cors";

vi.mock("@/lib/api-auth", () => ({ requireProviderAccess: vi.fn() }));
vi.mock("@/lib/storage", () => ({ getStorageAdapter: vi.fn() }));
const getBucketCors = vi.fn();
const putBucketCors = vi.fn();
const origin = "https://console.example.com";
const context = { params: Promise.resolve({ providerId: "p1" }) };
const request = () => new Request("http://localhost/api/fs/p1/cors", { method: "PUT", body: JSON.stringify({ origin, bucket: "bucket" }) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireProviderAccess).mockResolvedValue([{ user: { id: "u1" }, expires: "", requirePasswordChange: false }, { id: "p1" }, null]);
  vi.mocked(getStorageAdapter).mockResolvedValue({ getBucketCors, putBucketCors } as unknown as Awaited<ReturnType<typeof getStorageAdapter>>);
});

describe("CORS 控制面", () => {
  it("鉴权失败不调用云端", async () => {
    vi.mocked(requireProviderAccess).mockResolvedValue([null, null, new Response("denied", { status: 403 }) as never]);
    expect((await PUT(request(), context)).status).toBe(403);
    expect(getStorageAdapter).not.toHaveBeenCalled();
  });
  it("拒绝 path origin，不写云端", async () => {
    expect((await GET(new Request(`http://localhost/?bucket=bucket&origin=${origin}/path`), context)).status).toBe(400);
    expect(getStorageAdapter).not.toHaveBeenCalled();
  });
  it("只读返回原规则及推荐，不写入", async () => {
    getBucketCors.mockResolvedValueOnce([]);
    const res = await GET(new Request(`http://localhost/?bucket=bucket&origin=${origin}`), context);
    expect(await res.json()).toMatchObject({ origin, compatible: false, rules: [], recommendedRule: recommendedCorsRule(origin) });
    expect(putBucketCors).not.toHaveBeenCalled();
  });
  it("保留现有规则并回读确认", async () => {
    const old = [{ AllowedOrigins: ["https://other.example.com"], AllowedMethods: ["DELETE"], ID: "existing" }];
    const merged = [recommendedCorsRule(origin), ...old];
    getBucketCors.mockResolvedValueOnce(old).mockResolvedValueOnce(merged);
    const res = await PUT(request(), context);
    expect(res.status).toBe(200);
    expect(putBucketCors).toHaveBeenCalledWith("bucket", merged);
    expect(await res.json()).toMatchObject({ compatible: true, rules: merged });
  });
  it("GetBucketCors 无权限时绝不以空配置覆盖", async () => {
    getBucketCors.mockRejectedValueOnce(Object.assign(new Error("not allowed"), { name: "AccessDenied", $metadata: { httpStatusCode: 403 } }));
    const res = await PUT(request(), context);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ compatible: false, recommendedRule: recommendedCorsRule(origin), error: expect.stringContaining("云控制台") });
    expect(putBucketCors).not.toHaveBeenCalled();
  });
  it("写入失败保留原规则并报告错误而非成功", async () => {
    const old = [{ AllowedOrigins: ["https://old.example"], AllowedMethods: ["GET"] }];
    getBucketCors.mockResolvedValueOnce(old);
    putBucketCors.mockRejectedValueOnce(new Error("NotImplemented"));
    const res = await PUT(request(), context);
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ compatible: false, rules: old, issues: [expect.stringContaining("OSS")] });
  });
  it("写入成功但回读失败不假装兼容", async () => {
    getBucketCors.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("network"));
    putBucketCors.mockResolvedValueOnce(undefined);
    const res = await PUT(request(), context);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain("写入已被云端接受");
  });
});
