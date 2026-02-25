"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type UserProfile = {
  githubId: string | null;
  githubUsername: string | null;
  passwordLoginEnabled: boolean;
  githubWhitelist: string | null;
  githubOAuthConfigured: boolean;
  githubClientId: string;
};

export function GitHubBindingForm() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [githubUsername, setGithubUsername] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setGithubUsername(data.githubWhitelist || "");
        setClientId(data.githubClientId || "");
      }
    } catch { toast.error("加载用户信息失败"); }
    finally { setLoading(false); }
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
        body: JSON.stringify({ clientId: clientId.trim(), clientSecret: clientSecret.trim() }),
      });
      if (res.ok) {
        toast.success("GitHub OAuth 配置已保存");
        setClientSecret("");
        loadProfile();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "保存失败");
      }
    } catch { toast.error("网络错误"); }
    finally { setSaving(false); }
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
    } catch { toast.error("网络错误"); }
    finally { setSaving(false); }
  }

  async function handleSetWhitelist() {
    if (!githubUsername.trim()) { toast.error("请输入 GitHub 用户名"); return; }
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
    } catch { toast.error("网络错误"); }
    finally { setSaving(false); }
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
    } catch { toast.error("网络错误"); }
    finally { setSaving(false); }
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
    } catch { toast.error("网络错误"); }
    finally { setSaving(false); }
  }

  function handleGitHubLogin() {
    signIn("github", { callbackUrl: "/settings" });
  }

  if (loading) return <div className="text-muted-foreground text-sm">加载中...</div>;
  if (!profile) return null;

  const isBound = !!profile.githubId;
  const oauthReady = profile.githubOAuthConfigured;

  return (
    <div className="space-y-6">
      {/* GitHub OAuth Config */}
      <div>
        <h3 className="text-sm font-medium mb-2">GitHub OAuth 应用配置</h3>
        {oauthReady ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Client ID: <span className="font-mono">{profile.githubClientId.slice(0, 8)}...</span>
            </span>
            <Button size="sm" variant="outline" onClick={handleClearOAuth} disabled={saving}>
              清除配置
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-2">
              在 GitHub Settings &gt; Developer settings &gt; OAuth Apps 中创建应用，回调地址填写：
              <code className="ml-1 px-1 py-0.5 bg-muted rounded text-xs">{typeof window !== "undefined" ? window.location.origin : ""}/api/auth/callback/github</code>
            </p>
            <Input
              placeholder="Client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Client Secret"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
            <Button size="sm" onClick={handleSaveOAuth} disabled={saving}>
              保存 OAuth 配置
            </Button>
          </div>
        )}
      </div>

      {/* PLACEHOLDER_REST */}

      {/* GitHub binding status */}
      <div>
        <h3 className="text-sm font-medium mb-2">GitHub 绑定状态</h3>
        {isBound ? (
          <div className="flex items-center gap-3">
            <span className="text-sm">
              已绑定: <span className="font-medium">{profile.githubUsername}</span>
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleUnbind}
              disabled={saving || !profile.passwordLoginEnabled}
            >
              解绑
            </Button>
            {!profile.passwordLoginEnabled && (
              <span className="text-xs text-muted-foreground">需先启用密码登录</span>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">尚未绑定 GitHub 账号</p>
            <div className="flex items-center gap-2">
              <Input
                placeholder="GitHub 用户名"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                className="w-48"
                disabled={!oauthReady}
              />
              <Button size="sm" variant="outline" onClick={handleSetWhitelist} disabled={saving || !oauthReady}>
                设置白名单
              </Button>
            </div>
            {profile.githubWhitelist && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  白名单: {profile.githubWhitelist}
                </span>
                <Button size="sm" onClick={handleGitHubLogin} disabled={!oauthReady}>
                  使用 GitHub 登录绑定
                </Button>
              </div>
            )}
            {!oauthReady && (
              <p className="text-xs text-muted-foreground">请先配置 GitHub OAuth 应用</p>
            )}
          </div>
        )}
      </div>

      {/* Password login toggle */}
      <div>
        <h3 className="text-sm font-medium mb-2">密码登录</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm">
            {profile.passwordLoginEnabled ? "已启用" : "已关闭"}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleTogglePasswordLogin(!profile.passwordLoginEnabled)}
            disabled={saving || (!profile.passwordLoginEnabled && !isBound)}
          >
            {profile.passwordLoginEnabled ? "关闭" : "启用"}
          </Button>
          {!isBound && !profile.passwordLoginEnabled && (
            <span className="text-xs text-muted-foreground">需先绑定 GitHub</span>
          )}
        </div>
      </div>
    </div>
  );
}
