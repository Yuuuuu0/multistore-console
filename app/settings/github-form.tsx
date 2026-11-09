"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { CheckCircle2, Key, Link2, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type UserProfile = {
  githubId: string | null;
  githubUsername: string | null;
  passwordLoginEnabled: boolean;
  githubWhitelist: string | null;
  githubOAuthConfigured: boolean;
  githubClientId: string;
};

/**
 * GitHub OAuth 配置、账号绑定与密码登录开关组件
 */
export function GitHubBindingForm() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [githubUsername, setGithubUsername] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setGithubUsername(data.githubWhitelist || "");
        setClientId(data.githubClientId || "");
      }
    } catch {
      toast.error("加载用户信息失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveOAuth() {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error("请填写 Client ID 和 Client Secret");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
        }),
      });
      if (res.ok) {
        toast.success("GitHub OAuth 配置已保存");
        setClientSecret("");
        loadProfile();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "保存失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearOAuth() {
    if (!confirm("确定清除 GitHub OAuth 配置？")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: "", clientSecret: "" }),
      });
      if (res.ok) {
        toast.success("GitHub OAuth 配置已清除");
        setClientId("");
        setClientSecret("");
        loadProfile();
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetWhitelist() {
    if (!githubUsername.trim()) {
      toast.error("请输入 GitHub 用户名");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUsername: githubUsername.trim() }),
      });
      if (res.ok) {
        toast.success("GitHub 白名单已设置，请使用 GitHub 登录完成绑定");
        loadProfile();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "设置失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnbind() {
    if (!confirm("确定解绑 GitHub 账号？")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/github", { method: "DELETE" });
      if (res.ok) {
        toast.success("已解绑 GitHub");
        loadProfile();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "解绑失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePasswordLogin(enabled: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/user/password-login", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        toast.success(enabled ? "密码登录已启用" : "密码登录已关闭");
        loadProfile();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "操作失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  }

  function handleGitHubLogin() {
    signIn("github", { callbackUrl: "/settings" });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs py-4">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        加载中...
      </div>
    );
  }
  if (!profile) return null;

  const isBound = !!profile.githubId;
  const oauthReady = profile.githubOAuthConfigured;

  return (
    <div className="space-y-5 text-xs">
      {/* GitHub OAuth Config */}
      <div className="rounded-lg border bg-background/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-primary" />
            <span>GitHub OAuth 应用配置</span>
          </h3>
          <Badge
            variant={oauthReady ? "outline" : "secondary"}
            className="text-[10px] font-mono"
          >
            {oauthReady ? "CONFIGURED" : "UNCONFIGURED"}
          </Badge>
        </div>

        {oauthReady ? (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-xs text-muted-foreground">
              Client ID:{" "}
              <span className="font-mono text-foreground font-medium">
                {profile.githubClientId.slice(0, 8)}...
              </span>
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearOAuth}
              disabled={saving}
              className="h-8 text-xs"
            >
              清除配置
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
              <p>
                在 GitHub Settings &gt; Developer settings &gt; OAuth Apps
                中创建应用，回调地址填写：
              </p>
              <code className="inline-block px-2 py-1 bg-muted rounded font-mono text-[11px] text-foreground break-all">
                {typeof window !== "undefined" ? window.location.origin : ""}
                /api/auth/callback/github
              </code>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Input
                placeholder="Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="font-mono text-xs"
              />
              <Input
                type="password"
                placeholder="Client Secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <Button size="sm" onClick={handleSaveOAuth} disabled={saving}>
              保存 OAuth 配置
            </Button>
          </div>
        )}
      </div>

      {/* GitHub binding status */}
      <div className="rounded-lg border bg-background/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-primary" />
            <span>GitHub 绑定状态</span>
          </h3>
          <Badge
            variant={isBound ? "outline" : "secondary"}
            className="text-[10px] font-mono"
          >
            {isBound ? "BOUND" : "UNBOUND"}
          </Badge>
        </div>

        {isBound ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              已绑定:{" "}
              <span className="font-mono font-semibold">
                {profile.githubUsername}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleUnbind}
                disabled={saving || !profile.passwordLoginEnabled}
                className="h-8 text-xs"
              >
                解绑
              </Button>
              {!profile.passwordLoginEnabled && (
                <span className="text-xs text-muted-foreground">
                  需先启用密码登录
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">尚未绑定 GitHub 账号</p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="GitHub 用户名"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                className="w-52 font-mono text-xs"
                disabled={!oauthReady}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleSetWhitelist}
                disabled={saving || !oauthReady}
                className="h-9 text-xs"
              >
                设置白名单
              </Button>
            </div>
            {profile.githubWhitelist && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60">
                <span className="text-xs font-mono text-muted-foreground">
                  白名单: {profile.githubWhitelist}
                </span>
                <Button
                  size="sm"
                  onClick={handleGitHubLogin}
                  disabled={!oauthReady}
                  className="h-8 text-xs"
                >
                  使用 GitHub 登录绑定
                </Button>
              </div>
            )}
            {!oauthReady && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                请先配置 GitHub OAuth 应用
              </p>
            )}
          </div>
        )}
      </div>

      {/* Password login toggle */}
      <div className="rounded-lg border bg-background/60 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-xs font-semibold">密码登录</h3>
          <p className="text-[11px] text-muted-foreground">
            绑定 GitHub 后可选择关闭传统密码登录以提升安全性
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={profile.passwordLoginEnabled ? "outline" : "secondary"}
            className="font-mono text-[10px]"
          >
            {profile.passwordLoginEnabled ? "已启用" : "已关闭"}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              handleTogglePasswordLogin(!profile.passwordLoginEnabled)
            }
            disabled={saving || (!profile.passwordLoginEnabled && !isBound)}
            className="h-8 text-xs"
          >
            {profile.passwordLoginEnabled ? "关闭" : "启用"}
          </Button>
          {!isBound && !profile.passwordLoginEnabled && (
            <span className="text-xs text-muted-foreground">
              需先绑定 GitHub
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
