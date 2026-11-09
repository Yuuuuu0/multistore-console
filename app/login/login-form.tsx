"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Boxes,
  HardDrive,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Footer } from "@/components/footer";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

/**
 * 控制台身份认证与登录门户组件
 */
export function LoginForm({
  hasGithub,
  passwordLoginEnabled,
}: {
  hasGithub: boolean;
  passwordLoginEnabled: boolean;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError(
        res.error === "密码登录已禁用"
          ? "密码登录已禁用，请使用 GitHub 登录"
          : "用户名或密码错误",
      );
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  const showDivider = passwordLoginEnabled && hasGithub;

  return (
    <div className="min-h-dvh bg-background bg-architectural-grid flex flex-col lg:flex-row">
      {/* 左侧工业架构海报区 */}
      <div className="hidden lg:flex lg:w-7/12 border-r border-border bg-sidebar/60 p-12 flex-col justify-between relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-base tracking-tight">
                MultiStore Console
              </div>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                UNIFIED OBJECT STORAGE MATRIX
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-background/70 text-[11px] font-mono text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            SYSTEM READY
          </span>
        </div>

        <div className="max-w-xl space-y-6 my-auto">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded border border-primary/30 bg-primary/10 text-primary text-xs font-mono">
            <span>S3 // OSS // COS // R2 // MINIO</span>
          </div>
          <h2 className="text-4xl xl:text-5xl font-bold tracking-tight leading-[1.12]">
            多云对象存储的
            <br />
            <span className="text-primary">精密控制中枢</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            在单一低延迟工作台内统一编排 AWS S3、阿里云 OSS、腾讯云 COS 及 S3
            兼容存储桶。支持预签名并发直传、大文件分片断点续传、CORS
            直传策略诊断、跨云异步流转与全链路操作审计。
          </p>

          <div className="grid grid-cols-3 gap-3 pt-4">
            <div className="rounded-lg border bg-card/70 p-3.5 space-y-1">
              <HardDrive className="w-4 h-4 text-primary" />
              <div className="text-xs font-semibold pt-1">多云统一挂载</div>
              <div className="text-[11px] text-muted-foreground font-mono">
                Multi-Provider IO
              </div>
            </div>
            <div className="rounded-lg border bg-card/70 p-3.5 space-y-1">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <div className="text-xs font-semibold pt-1">直传与分片引擎</div>
              <div className="text-[11px] text-muted-foreground font-mono">
                CORS & Multipart
              </div>
            </div>
            <div className="rounded-lg border bg-card/70 p-3.5 space-y-1">
              <KeyRound className="w-4 h-4 text-primary" />
              <div className="text-xs font-semibold pt-1">凭据加密与审计</div>
              <div className="text-[11px] text-muted-foreground font-mono">
                AES-256 & Audit
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs font-mono text-muted-foreground flex items-center justify-between border-t border-border/60 pt-4">
          <span>SELF-HOSTED OBJECT GATEWAY</span>
          <span>PROTOCOL // S3 V4 SIGNATURE</span>
        </div>
      </div>

      {/* 右侧身份验证终端 */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10">
        <div className="flex lg:hidden items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Boxes className="w-4 h-4" />
          </div>
          <span className="font-semibold text-base">MultiStore Console</span>
        </div>

        <div className="w-full max-w-sm mx-auto my-auto space-y-6">
          <div className="rounded-xl border bg-card/90 backdrop-blur p-6 sm:p-8 shadow-sm space-y-6">
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
                AUTHENTICATION // 身份验证
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                MultiStore Console
              </h1>
              <p className="text-xs text-muted-foreground">
                请验证管理员凭据以进入对象存储控制台
              </p>
            </div>

            {passwordLoginEnabled && (
              <form onSubmit={handleCredentials} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    用户名
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      placeholder="用户名"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    密码
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      type="password"
                      placeholder="密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      登录中...
                    </>
                  ) : (
                    <>
                      <span>登录</span>
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {showDivider && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-mono">
                    或
                  </span>
                </div>
              </div>
            )}

            {hasGithub && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
              >
                <GitHubIcon className="w-4 h-4 mr-2" />
                使用 GitHub 登录
              </Button>
            )}
          </div>
        </div>

        <div className="max-w-sm w-full mx-auto">
          <Footer />
        </div>
      </div>
    </div>
  );
}
