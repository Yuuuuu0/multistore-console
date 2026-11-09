// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireProviderAccess } from "@/lib/api-auth";
import { getStorageAdapter } from "@/lib/storage";
import { GET } from "./route";

vi.mock("@/lib/api-auth", () => ({ requireProviderAccess: vi.fn() }));
vi.mock("@/lib/storage", () => ({ getStorageAdapter: vi.fn() }));
const getPresignedPutUrl = vi.fn();
const context = { params: Promise.resolve({ providerId: "p1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireProviderAccess).mockResolvedValue([{ user: { id: "u1" }, expires: "", requirePasswordChange: false }, { id: "p1" }, null]);
  vi.mocked(getStorageAdapter).mockResolvedValue({ getPresignedPutUrl } as unknown as Awaited<ReturnType<typeof getStorageAdapter>>);
});

describe("浏览器 PUT 签名契约", () => {
  it("按 provider 鉴权并返回精确 content-type、方法与禁止缓存", async () => {
    getPresignedPutUrl.mockResolvedValueOnce("https://store.example/file?signature=test");
    const response = await GET(new Request("http://localhost/?bucket=b&key=file&contentType=text%2Fplain"), context);
    expect(requireProviderAccess).toHaveBeenCalledWith("p1");
    expect(getPresignedPutUrl).toHaveBeenCalledWith("b", "file", { expiresIn: 900, contentType: "text/plain" });
    expect(await response.json()).toEqual({ url: "https://store.example/file?signature=test", method: "PUT", headers: { "Content-Type": "text/plain" } });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("保留既有省略 contentType 的契约", async () => {
    getPresignedPutUrl.mockResolvedValueOnce("https://store.example/file");
    const response = await GET(new Request("http://localhost/?bucket=b&key=file"), context);
    expect((await response.json()).headers).toEqual({});
  });
});
