import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUploadQueue } from "./upload-queue";

const fetchMock = vi.fn();
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const file = new File(["hello"], "hello.txt", { type: "text/plain" });
const options = () => ({ providerId: "p1", bucket: "bucket", concurrency: 2, onProgress: vi.fn(), onComplete: vi.fn(), onError: vi.fn(), onWarning: vi.fn() });

beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("小文件浏览器直传", () => {
  it("只向对象存储 PUT 文件，系统只收签名查询和完成 JSON", async () => {
    fetchMock.mockResolvedValueOnce(json({ url: "https://bucket.storage.example/hello.txt", method: "PUT", headers: { "Content-Type": "text/plain" } }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(json({ success: true }));
    const callbacks = options();
    const queue = createUploadQueue(callbacks);
    queue.addTasks([{ file, key: "folder/hello.txt" }]);
    await queue.start();
    expect(fetchMock.mock.calls[0][0]).toContain("/presign-put?");
    expect(new URL(fetchMock.mock.calls[0][0], "https://console.example").searchParams.get("contentType")).toBe("text/plain");
    expect(fetchMock.mock.calls[1]).toEqual(["https://bucket.storage.example/hello.txt", { method: "PUT", headers: { "Content-Type": "text/plain" }, credentials: "omit", body: file }]);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ bucket: "bucket", key: "folder/hello.txt", fileSize: 5 });
    expect(fetchMock.mock.calls.some(([url]) => /\/upload\?/.test(String(url)))).toBe(false);
    expect(callbacks.onComplete).toHaveBeenCalledWith({ ok: 1, fail: 0 });
  });
  it("签名错误到达调用方，不发文件或退回中转", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: "无权访问 Provider" }, 403));
    const callbacks = options();
    const queue = createUploadQueue(callbacks);
    queue.addTasks([{ file, key: file.name }]);
    await queue.start();
    expect(callbacks.onError).toHaveBeenCalledWith("无权访问 Provider", expect.anything());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(callbacks.onComplete).toHaveBeenCalledWith({ ok: 0, fail: 1 });
  });
  it("PUT 成功后确认失败只警告，绝不重传文件", async () => {
    fetchMock.mockResolvedValueOnce(json({ url: "https://store/file", method: "PUT", headers: {} }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(json({ error: "HEAD AccessDenied" }, 502));
    const callbacks = options();
    const queue = createUploadQueue(callbacks);
    queue.addTasks([{ file, key: file.name }]);
    await queue.start();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(callbacks.onWarning).toHaveBeenCalledWith(expect.stringContaining("HEAD AccessDenied"), expect.anything());
    expect(callbacks.onError).not.toHaveBeenCalled();
    expect(callbacks.onComplete).toHaveBeenCalledWith({ ok: 1, fail: 0 });
  });
  it("网络失败报告 CORS 不确定性而非吞掉错误", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((url) => String(url).includes("presign-put")
      ? Promise.resolve(json({ url: "https://store/file", method: "PUT", headers: {} }))
      : Promise.reject(new TypeError("Failed to fetch")));
    const callbacks = options();
    const queue = createUploadQueue(callbacks);
    queue.addTasks([{ file, key: file.name }]);
    const running = queue.start();
    await vi.runAllTimersAsync();
    await running;
    expect(callbacks.onError).toHaveBeenCalledWith(expect.stringContaining("不一定是 CORS"), expect.anything());
    expect(fetchMock.mock.calls.every(([url]) => !String(url).includes("/upload?"))).toBe(true);
  });
  it("对象存储 HTTP 403 保留 XML 签名原因", async () => {
    fetchMock.mockResolvedValueOnce(json({ url: "https://store/file", method: "PUT", headers: {} }))
      .mockResolvedValueOnce(new Response("<Error><Code>SignatureDoesNotMatch</Code><Message>bad signature</Message></Error>", { status: 403 }));
    const callbacks = options();
    const queue = createUploadQueue(callbacks);
    queue.addTasks([{ file, key: file.name }]);
    await queue.start();
    expect(callbacks.onError).toHaveBeenCalledWith(expect.stringContaining("SignatureDoesNotMatch"), expect.anything());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
