// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireProviderAccess } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { getStorageAdapter } from "@/lib/storage";
import { POST } from "./route";

vi.mock("@/lib/api-auth", () => ({ requireProviderAccess: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));
vi.mock("@/lib/storage", () => ({ getStorageAdapter: vi.fn() }));
const headObject = vi.fn();
const context = { params: Promise.resolve({ providerId: "p1" }) };
const request = () => new Request("http://localhost/api/fs/p1/upload-complete", { method: "POST", body: JSON.stringify({ bucket: "bucket", key: "file.txt", fileSize: 5 }) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireProviderAccess).mockResolvedValue([{ user: { id: "u1", name: "user" }, expires: "", requirePasswordChange: false }, { id: "p1" }, null]);
  vi.mocked(getStorageAdapter).mockResolvedValue({ headObject } as unknown as Awaited<ReturnType<typeof getStorageAdapter>>);
});

describe("直传完成确认", () => {
  it("HeadObject 核实大小后才记录 FILE_UPLOAD", async () => {
    headObject.mockResolvedValueOnce({ ContentLength: 5 });
    const res = await POST(request(), context);
    expect(res.status).toBe(200);
    expect(headObject).toHaveBeenCalledWith("bucket", "file.txt");
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "FILE_UPLOAD", metadata: { fileSize: 5, uploadType: "direct" } }));
  });
  it("大小不符不记录成功审计", async () => {
    headObject.mockResolvedValueOnce({ ContentLength: 10 });
    expect((await POST(request(), context)).status).toBe(409);
    expect(logAudit).not.toHaveBeenCalled();
  });
  it("仅 PutObject 凭证不具备 HEAD 权限时明确提醒且不重新上传", async () => {
    headObject.mockRejectedValueOnce(new Error("AccessDenied"));
    const res = await POST(request(), context);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/仅 PutObject 权限不足.*不会自动重新上传/);
    expect(logAudit).not.toHaveBeenCalled();
  });
});
