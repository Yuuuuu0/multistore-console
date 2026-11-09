"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Globe,
  HardDrive,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type S3CorsRule = {
  AllowedOrigins: string[];
  AllowedMethods: string[];
  AllowedHeaders: string[];
  ExposeHeaders: string[];
  MaxAgeSeconds: number;
};

export type CorsDiagnosticResult = {
  origin: string;
  rules: unknown[];
  rulesKnown: boolean;
  recommendedRule: unknown;
  compatible: boolean;
  issues: string[];
};

type CorsConfigDialogProps = {
  open: boolean;
  providerId: string | null;
  providerName?: string;
  bucket: string | null;
  onClose: () => void;
};

function buildFallbackRecommendedRule(origin: string): S3CorsRule {
  return {
    AllowedOrigins: [origin || "*"],
    AllowedMethods: ["PUT", "GET", "HEAD"],
    AllowedHeaders: ["*"],
    ExposeHeaders: ["ETag"],
    MaxAgeSeconds: 3600,
  };
}

/**
 * 从推荐规则对象中提取标准化字段，确保手工配置说明卡片与推荐 JSON 完全一致；仅在缺失时回退默认值
 */
function resolveRuleFields(rawRule: unknown, fallbackOrigin: string): S3CorsRule {
  const fallback = buildFallbackRecommendedRule(fallbackOrigin);
  if (!rawRule || typeof rawRule !== "object") {
    return fallback;
  }
  const r = rawRule as Record<string, unknown>;
  return {
    AllowedOrigins:
      Array.isArray(r.AllowedOrigins) && r.AllowedOrigins.length > 0
        ? r.AllowedOrigins.map(String)
        : fallback.AllowedOrigins,
    AllowedMethods:
      Array.isArray(r.AllowedMethods) && r.AllowedMethods.length > 0
        ? r.AllowedMethods.map(String)
        : fallback.AllowedMethods,
    AllowedHeaders:
      Array.isArray(r.AllowedHeaders) && r.AllowedHeaders.length > 0
        ? r.AllowedHeaders.map(String)
        : fallback.AllowedHeaders,
    ExposeHeaders:
      Array.isArray(r.ExposeHeaders) && r.ExposeHeaders.length > 0
        ? r.ExposeHeaders.map(String)
        : fallback.ExposeHeaders,
    MaxAgeSeconds:
      typeof r.MaxAgeSeconds === "number" && Number.isFinite(r.MaxAgeSeconds)
        ? r.MaxAgeSeconds
        : fallback.MaxAgeSeconds,
  };
}

/**
 * 存储桶浏览器直传（CORS）检测与配置对话框
 * 1. 打开或点击「重新检测」时执行 GET 检查；即使 403/502 等云端错误也解析返回 JSON 并展示服务端 error、issues 指导与手工配置规则。
 * 2. 原规则在 GET 失败时标记为未知（rulesKnown=false），避免将空数组误判为“未配置规则”。
 * 3. 字段说明卡片动态跟随实际 recommendedRule 字段（仅无服务端规则时 fallback 使用 *），保证同屏字段与 JSON 严格一致。
 * 4. 仅当用户明确点击「允许当前站点直传」时才执行 PUT；任何非 2xx 或含 error 响应均忠实展示错误，绝不提示成功。
 */
export function CorsConfigDialog({
  open,
  providerId,
  providerName,
  bucket,
  onClose,
}: CorsConfigDialogProps) {
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CorsDiagnosticResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const currentOrigin =
    typeof window !== "undefined" ? window.location.origin : "";

  const fallbackRule = buildFallbackRecommendedRule(currentOrigin);

  const fetchCorsStatus = useCallback(async () => {
    if (!providerId || !bucket || typeof window === "undefined") return;
    const origin = window.location.origin;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        bucket,
        origin,
      });
      const res = await fetch(
        `/api/fs/${encodeURIComponent(providerId)}/cors?${params.toString()}`,
      );
      const body = await res.json().catch(() => ({} as Record<string, unknown>));

      const hasServerError = !res.ok || typeof body.error === "string";
      if (hasServerError) {
        setError(
          (typeof body.error === "string" && body.error) ||
            `云端 CORS 检测未通过 (HTTP ${res.status})`,
        );
      }

      setData({
        origin: typeof body.origin === "string" ? body.origin : origin,
        rules: Array.isArray(body.rules) ? body.rules : [],
        rulesKnown: res.ok && !body.error,
        recommendedRule:
          body.recommendedRule ?? buildFallbackRecommendedRule(origin),
        compatible: res.ok && !body.error ? Boolean(body.compatible) : false,
        issues: Array.isArray(body.issues)
          ? (body.issues as string[])
          : [],
      });
    } catch {
      setError(
        "网络请求异常，无法通过服务端读取存储桶 CORS 配置，请参考下方手工规则在云控制台配置",
      );
      setData({
        origin: currentOrigin,
        rules: [],
        rulesKnown: false,
        recommendedRule: buildFallbackRecommendedRule(currentOrigin),
        compatible: false,
        issues: [],
      });
    } finally {
      setLoading(false);
    }
  }, [providerId, bucket, currentOrigin]);

  useEffect(() => {
    if (open && providerId && bucket) {
      fetchCorsStatus();
    } else if (!open) {
      setError(null);
      setData(null);
      setCopiedKey(null);
    }
  }, [open, providerId, bucket, fetchCorsStatus]);

  async function handleAllowDirectUpload() {
    if (!providerId || !bucket || typeof window === "undefined") return;
    const origin = window.location.origin;
    setApplying(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/fs/${encodeURIComponent(providerId)}/cors`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bucket,
            origin,
          }),
        },
      );
      const body = await res.json().catch(() => ({} as Record<string, unknown>));

      const hasError = !res.ok || typeof body.error === "string";
      if (hasError) {
        const msg =
          (typeof body.error === "string" && body.error) ||
          `自动写入或确认存储桶 CORS 规则失败 (HTTP ${res.status})`;
        setError(msg);
        setData((prev) => ({
          origin:
            typeof body.origin === "string"
              ? body.origin
              : prev?.origin || origin,
          rules: Array.isArray(body.rules) ? body.rules : prev?.rules || [],
          rulesKnown: false,
          recommendedRule:
            body.recommendedRule ??
            prev?.recommendedRule ??
            buildFallbackRecommendedRule(origin),
          compatible: false,
          issues: Array.isArray(body.issues)
            ? (body.issues as string[])
            : prev?.issues || [],
        }));
        toast.error(msg);
        return;
      }

      setData({
        origin: typeof body.origin === "string" ? body.origin : origin,
        rules: Array.isArray(body.rules) ? body.rules : [],
        rulesKnown: true,
        recommendedRule:
          body.recommendedRule ?? buildFallbackRecommendedRule(origin),
        compatible: Boolean(body.compatible),
        issues: Array.isArray(body.issues) ? (body.issues as string[]) : [],
      });
      toast.success("已合并写入当前站点 CORS 规则");
    } catch {
      const msg =
        "网络错误，无法自动写入存储桶 CORS 配置，请使用下方手工规则配置";
      setError(msg);
      toast.error(msg);
    } finally {
      setApplying(false);
    }
  }

  async function copyText(key: string, text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(`已复制${label}`);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    } catch {
      toast.error("复制失败，请手动选中复制");
    }
  }

  const effectiveOrigin = data?.origin || currentOrigin;
  const effectiveRecommendedRule = data?.recommendedRule ?? fallbackRule;
  const ruleFields = resolveRuleFields(
    effectiveRecommendedRule,
    effectiveOrigin,
  );
  const recommendedJson = JSON.stringify(effectiveRecommendedRule, null, 2);
  const recommendedArrayJson = JSON.stringify(
    [effectiveRecommendedRule],
    null,
    2,
  );

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30 shrink-0">
          <div className="flex items-center justify-between gap-2 pr-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  浏览器直传设置 (CORS)
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  检测存储桶跨域直传规则，支持自动合并（适用于支持 Get/PutBucketCors 的存储）或复制规则至云控制台手工配置
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* 目标存储桶与当前源信息 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-lg border bg-card p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                <HardDrive className="w-3 h-3" />
                <span>{"目标存储桶 // BUCKET"}</span>
              </div>
              <div className="font-mono font-medium truncate">
                {providerName ? `${providerName} / ` : ""}
                {bucket || "--"}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-3 space-y-1">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                  <Globe className="w-3 h-3" />
                  <span>{"当前站点源 // ORIGIN"}</span>
                </div>
                {effectiveOrigin && (
                  <button
                    type="button"
                    onClick={() =>
                      copyText("origin", effectiveOrigin, "当前站点 Origin")
                    }
                    className="inline-flex items-center gap-1 text-[10px] font-mono text-primary hover:underline"
                  >
                    {copiedKey === "origin" ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>复制</span>
                  </button>
                )}
              </div>
              <div className="font-mono font-medium truncate">
                {effectiveOrigin || "--"}
              </div>
            </div>
          </div>

          {/* 加载态 */}
          {loading && (
            <div className="rounded-lg border border-dashed p-6 flex items-center justify-center gap-2.5 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <p className="text-xs font-medium">
                正在检测云端存储桶 CORS 规则与直传兼容性...
              </p>
            </div>
          )}

          {/* 服务端错误横幅（如 OSS S3 兼容接口不支持 CORS 管理、403 权限不足、502 或 PUT 回读未确认） */}
          {!loading && error && (
            <div className="rounded-lg border border-destructive/35 bg-destructive/10 p-4 space-y-2">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs flex-1 min-w-0">
                  <div className="font-semibold text-destructive flex items-center justify-between gap-2">
                    <span>云端自动检测或自动配置不可用</span>
                    <Badge
                      variant="destructive"
                      className="text-[10px] font-mono h-4 px-1.5"
                    >
                      MANUAL SETUP AVAILABLE
                    </Badge>
                  </div>
                  <p className="text-foreground/90 font-mono text-[11px] break-words leading-relaxed">
                    {error}
                  </p>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    部分存储商（如阿里云 OSS 的 S3 兼容端点）不支持通过 S3 API
                    读写 CORS，或当前 AccessKey 缺少 Bucket CORS
                    权限。请参照下方字段说明或直接复制 S3 JSON 规则前往云控制台手工配置。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 正常检测结果横幅（仅在无服务端报错且已完成检测时展示） */}
          {!loading && !error && data && (
            <div
              className={`rounded-lg border p-4 flex items-start justify-between gap-3 ${
                data.compatible
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-amber-500/35 bg-amber-500/10"
              }`}
            >
              <div className="flex items-start gap-2.5">
                {data.compatible ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="text-xs font-semibold flex items-center gap-2">
                    <span>
                      {data.compatible
                        ? "当前站点直传已就绪"
                        : "检测到直传 CORS 配置不兼容"}
                    </span>
                    <Badge
                      variant={data.compatible ? "outline" : "secondary"}
                      className="text-[10px] font-mono h-4 px-1.5"
                    >
                      {data.compatible ? "COMPATIBLE" : "ACTION REQUIRED"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {data.compatible
                      ? "当前存储桶已包含允许本站点直传及读取分片 ETag 的跨域规则。"
                      : "浏览器直接向对象存储上传文件或读取分片 ETag 时可能被跨域策略拦截。"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 诊断问题或详细配置指导列表 (issues) */}
          {!loading && data && data.issues.length > 0 && (
            <div className="rounded-lg border bg-card p-3.5 space-y-2">
              <div className="text-xs font-semibold flex items-center justify-between">
                <span>
                  {error ? "诊断与详细配置指导" : "检测到的配置问题"} (
                  {data.issues.length})
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  DIAGNOSTICS &amp; GUIDANCE
                </span>
              </div>
              <ul className="space-y-1.5">
                {data.issues.map((issue, idx) => (
                  <li
                    key={`${idx}-${issue}`}
                    className="text-xs text-amber-700 dark:text-amber-300/95 flex items-start gap-2 bg-amber-500/8 px-2.5 py-1.5 rounded border border-amber-500/20"
                  >
                    <span className="font-mono text-[10px] opacity-75 mt-0.5 shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="leading-relaxed break-words">{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 必需手工配置字段说明 + S3 JSON 规则复制面板（字段动态跟随实际 recommendedRule） */}
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="px-3.5 py-2.5 border-b bg-muted/30 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5 text-primary" />
                <span className="font-semibold">
                  直传必需 CORS 规则（S3 标准字段与手工配置说明）
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() =>
                    copyText("rule-obj", recommendedJson, "单条 S3 CORS 规则 JSON")
                  }
                >
                  {copiedKey === "rule-obj" ? (
                    <Check className="w-3 h-3 mr-1 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3 mr-1" />
                  )}
                  复制单条规则
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() =>
                    copyText(
                      "rule-arr",
                      recommendedArrayJson,
                      "S3 CORS 规则数组 JSON",
                    )
                  }
                >
                  {copiedKey === "rule-arr" ? (
                    <Check className="w-3 h-3 mr-1 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3 mr-1" />
                  )}
                  复制规则数组 JSON
                </Button>
              </div>
            </div>

            <div className="p-3.5 space-y-3 text-xs">
              {/* 字段级清楚说明（与 recommendedRule 严格同步） */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="rounded border bg-background/70 p-2.5 space-y-0.5">
                  <div className="font-mono font-semibold text-foreground">
                    AllowedOrigins (来源)
                  </div>
                  <div className="font-mono text-primary truncate">
                    {ruleFields.AllowedOrigins.join(", ")}
                  </div>
                  <div className="text-muted-foreground">
                    允许发起浏览器预签名直传的控制台域名
                  </div>
                </div>
                <div className="rounded border bg-background/70 p-2.5 space-y-0.5">
                  <div className="font-mono font-semibold text-foreground">
                    AllowedMethods (允许方法)
                  </div>
                  <div className="font-mono text-primary">
                    {ruleFields.AllowedMethods.join(", ")}
                  </div>
                  <div className="text-muted-foreground">
                    支持预签名上传、分片上传与对象元数据校验
                  </div>
                </div>
                <div className="rounded border bg-background/70 p-2.5 space-y-0.5">
                  <div className="font-mono font-semibold text-foreground">
                    AllowedHeaders (允许请求头)
                  </div>
                  <div className="font-mono text-primary">
                    {ruleFields.AllowedHeaders.join(", ")}
                  </div>
                  <div className="text-muted-foreground">
                    放行直传所需的请求头（云控制台亦可填 *）
                  </div>
                </div>
                <div className="rounded border bg-background/70 p-2.5 space-y-0.5">
                  <div className="font-mono font-semibold text-foreground">
                    ExposeHeaders &amp; MaxAgeSeconds
                  </div>
                  <div className="font-mono text-primary">
                    ExposeHeaders: {ruleFields.ExposeHeaders.join(", ")} |
                    MaxAgeSeconds: {ruleFields.MaxAgeSeconds}
                  </div>
                  <div className="text-muted-foreground">
                    暴露 {ruleFields.ExposeHeaders.join(", ")} 供分片合并读取；缓存预检{" "}
                    {ruleFields.MaxAgeSeconds} 秒
                  </div>
                </div>
              </div>

              {/* S3 JSON 推荐规则代码块 */}
              <div className="space-y-1">
                <div className="text-[11px] font-mono text-muted-foreground flex items-center justify-between">
                  <span>推荐 S3 JSON 规则 (recommendedRule):</span>
                  <span>S3 / COS / MinIO / R2 通用格式</span>
                </div>
                <pre className="p-3 rounded-md border bg-background font-mono text-[11px] overflow-x-auto max-h-44 leading-relaxed">
                  {recommendedJson}
                </pre>
              </div>

              {/* 当前桶已有规则状态（区分 rulesKnown，避免把失败时的空数组误认为未配置） */}
              <div className="space-y-1 pt-1 border-t border-border/60">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>云端现有规则状态 (rules):</span>
                  {data?.rulesKnown ? (
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      已读取 {data.rules.length} 条现有规则
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-mono">
                      现有规则未知（未通过 API 读取）
                    </Badge>
                  )}
                </div>
                {data?.rulesKnown ? (
                  data.rules.length > 0 ? (
                    <pre className="p-2.5 rounded-md border bg-background font-mono text-[11px] overflow-x-auto max-h-36">
                      {JSON.stringify(data.rules, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-[11px] text-muted-foreground font-mono py-1">
                      当前存储桶尚未配置任何 CORS 规则。
                    </div>
                  )
                ) : (
                  <div className="text-[11px] text-muted-foreground py-1">
                    无法通过当前存储商接口读取桶内原有 CORS
                    规则（不代表桶内无规则），请在云厂商控制台查看并追加上方推荐规则。
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 安全说明 */}
          <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground font-medium">
              自动配置说明：
            </strong>
            自动配置仅对支持 <code className="font-mono">GetBucketCors</code> /{" "}
            <code className="font-mono">PutBucketCors</code>{" "}
            的存储服务生效。点击「允许当前站点直传」将合并当前站点（
            <code className="font-mono text-foreground">{effectiveOrigin}</code>
            ）所需规则并保留桶内原有规则；若存储商不支持接口写入，请直接复制上方规则手工配置。
          </div>
        </div>

        <DialogFooter className="px-6 py-3.5 border-t bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchCorsStatus}
            disabled={loading || applying || !providerId || !bucket}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`}
            />
            重新检测
          </Button>
          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={applying}
            >
              关闭
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAllowDirectUpload}
              disabled={loading || applying || !providerId || !bucket}
            >
              {applying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  正在写入存储桶配置...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                  允许当前站点直传
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
