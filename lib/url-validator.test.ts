import { describe, expect, it } from "vitest";

import { checkEndpoint, validateEndpoint } from "./url-validator";

describe("url-validator", () => {
  it("空 endpoint 返回 null（安全）", () => {
    expect(validateEndpoint("")).toBeNull();
    expect(validateEndpoint(null as unknown as string)).toBeNull();
  });

  it("合法公网 S3 endpoint 返回 null", () => {
    expect(validateEndpoint("https://s3.amazonaws.com")).toBeNull();
    expect(validateEndpoint("https://oss-cn-hangzhou.aliyuncs.com")).toBeNull();
    expect(validateEndpoint("http://minio.example.com:9000")).toBeNull();
  });

  it("私有 IP 地址返回错误", () => {
    expect(validateEndpoint("http://127.0.0.1")).toContain("不允许");
    expect(validateEndpoint("http://10.0.0.1")).toContain("不允许");
    expect(validateEndpoint("http://172.16.0.1")).toContain("不允许");
    expect(validateEndpoint("http://192.168.1.1")).toContain("不允许");
    expect(validateEndpoint("http://169.254.169.254")).toContain("不允许");
  });

  it("被禁止主机名返回错误", () => {
    expect(validateEndpoint("http://localhost")).toContain("不允许");
    expect(validateEndpoint("http://metadata.google.internal")).toContain("不允许");
  });

  it("无效 URL 返回错误", () => {
    expect(validateEndpoint("not-a-url")).toBe("无效的 Endpoint URL 格式");
  });

  it("非 http/https 协议返回错误", () => {
    expect(validateEndpoint("ftp://example.com")).toContain("不允许的协议");
  });

  it("checkEndpoint: 安全地址返回 null", () => {
    expect(checkEndpoint("https://s3.amazonaws.com")).toBeNull();
  });

  it("checkEndpoint: 非法地址返回 400 响应", async () => {
    const res = checkEndpoint("http://127.0.0.1");

    expect(res).not.toBeNull();
    expect(res?.status).toBe(400);
    const body = await res?.json();
    expect(body.error).toContain("不允许");
  });
});
