import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMultipartUploader } from "./multipart-upload";

const fetchMock = vi.fn();
const sent: { method: string; url: string; body: Blob }[] = [];
let responseEtag: string | null = '"part-etag"';
let networkFailure = false;

/** 可控制响应头和网络故障的 XHR，用于验证浏览器直传分片。 */
class UploadXHR {
  upload = { onprogress: null };
  status = 200;
  responseText = "";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  method = "";
  url = "";
  open(method: string, url: string) { this.method = method; this.url = url; }
  send(body: Blob) {
    sent.push({ method: this.method, url: this.url, body });
    queueMicrotask(() => networkFailure ? this.onerror?.() : this.onload?.());
  }
  getResponseHeader() { return responseEtag; }
  abort() { this.onabort?.(); }
}

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const options = () => ({ file: new File(["abcdef"], "parts.txt"), providerId: "p1", bucket: "bucket", key: "parts.txt", onProgress: vi.fn(), onComplete: vi.fn(), onError: vi.fn() });

beforeEach(() => {
  fetchMock.mockReset();
  responseEtag = '"part-etag"'; networkFailure = false; sent.length = 0;
  localStorage.clear();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("XMLHttpRequest", UploadXHR);
  fetchMock.mockImplementation((url) => {
    if (String(url).endsWith("/create")) return Promise.resolve(json({ uploadId: "u1", partSize: 3, totalParts: 2 }));
    if (String(url).endsWith("/presign")) return Promise.resolve(json({ url: "https://store.example/part" }));
    return Promise.resolve(json({ success: true }));
  });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("分片直传错误与 ETag", () => {
  it("分片字节只由 XHR PUT 到对象存储，ETag 原样交给合并接口", async () => {
    const callbacks = options();
    await createMultipartUploader(callbacks).start();
    expect(sent).toHaveLength(2);
    expect(sent.every((entry) => entry.method === "PUT" && entry.url === "https://store.example/part" && entry.body.size === 3)).toBe(true);
    const complete = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/complete"));
    expect(JSON.parse(complete?.[1].body).parts).toEqual([{ partNumber: 1, etag: '"part-etag"' }, { partNumber: 2, etag: '"part-etag"' }]);
    expect(callbacks.onComplete).toHaveBeenCalledOnce();
  });
  it("ETag 被 CORS 隐藏时立即报告具体配置，不吞为分片失败或中转", async () => {
    responseEtag = null;
    const callbacks = options();
    await createMultipartUploader(callbacks).start();
    expect(callbacks.onError).toHaveBeenCalledWith(expect.stringMatching(/ETag.*ExposeHeaders/));
    expect(sent).toHaveLength(2);
    expect(callbacks.onComplete).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls.some(([url]) => /\/complete$|\/upload\?/.test(String(url)))).toBe(false);
  });
  it("控制面签名错误保留服务端原因", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((url) => String(url).endsWith("/create")
      ? Promise.resolve(json({ uploadId: "u1", partSize: 6, totalParts: 1 }))
      : Promise.resolve(json({ error: "Provider AccessDenied" }, 403)));
    const callbacks = options();
    const running = createMultipartUploader(callbacks).start();
    await vi.runAllTimersAsync(); await running;
    expect(callbacks.onError).toHaveBeenCalledWith(expect.stringContaining("Provider AccessDenied"));
    expect(sent).toHaveLength(0);
  });
  it("网络错误保留诊断且不笼统断言 CORS", async () => {
    vi.useFakeTimers(); networkFailure = true;
    const callbacks = options();
    const running = createMultipartUploader(callbacks).start();
    await vi.runAllTimersAsync(); await running;
    expect(callbacks.onError).toHaveBeenCalledWith(expect.stringContaining("不一定是 CORS"));
    expect(callbacks.onComplete).not.toHaveBeenCalled();
  });
});
