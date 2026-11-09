import { describe, expect, it } from "vitest";
import { inspectCors, mergeCorsRules, parseCorsOrigin, recommendedCorsRule } from "./cors";

const origin = "https://console.example.com";

describe("CORS 校验与保留规则合并", () => {
  it.each([null, "null", "*", "ftp://example.com", "https://user:pw@example.com", "https://example.com/path", "https://example.com/", "https://example.com?x=1", "https://example.com#x", "https://*.example.com", "https://example.com\\path", "https://example.com\n"]) ("拒绝非法 origin %s", (input) => {
    expect(parseCorsOrigin(input)).toBeNull();
  });
  it.each([origin, "http://localhost:3000", "http://[::1]:3000"])("支持合法源 %s", (input) => expect(parseCorsOrigin(input)).toBe(input));
  it("检测方法、Content-Type 和 ETag 缺失", () => {
    const result = inspectCors(origin, [{ AllowedOrigins: [origin], AllowedMethods: ["PUT"] }]);
    expect(result.compatible).toBe(false);
    expect(result.issues.join(" ")).toMatch(/GET.*HEAD.*Content-Type.*ETag/);
  });
  it("兼容已有通配 origin/header，大小写不敏感的 ETag", () => {
    expect(inspectCors(origin, [{ AllowedOrigins: ["https://*.example.com"], AllowedMethods: ["PUT", "GET", "HEAD"], AllowedHeaders: ["*"], ExposeHeaders: ["etag"] }]).compatible).toBe(true);
  });
  it("识别前序规则遮挡 ETag 并将精确规则前置，保留旧规则内容", () => {
    const old = [{ AllowedOrigins: ["*"], AllowedMethods: ["PUT"], AllowedHeaders: ["*"], ID: "legacy" }, recommendedCorsRule(origin)];
    expect(inspectCors(origin, old).compatible).toBe(false);
    const merged = mergeCorsRules(origin, old);
    expect(merged[1]).toEqual(old[0]);
    expect(inspectCors(origin, merged).compatible).toBe(true);
    expect(old[0].ID).toBe("legacy");
  });
  it("不扩大其它 origin 的权限，保留规则和顺序；重复合并不写入", () => {
    const legacy = [{ AllowedOrigins: ["https://other.example"], AllowedMethods: ["DELETE"], ID: "other", MaxAgeSeconds: 100 }];
    const merged = mergeCorsRules(origin, legacy);
    expect(merged).toEqual([recommendedCorsRule(origin), ...legacy]);
    expect(mergeCorsRules(origin, merged)).toBe(merged);
  });
});
