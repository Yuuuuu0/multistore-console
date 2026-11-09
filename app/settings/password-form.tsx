"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * 管理员密码修改表单组件
 */
export function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("新密码至少 8 位");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "修改失败");
        return;
      }

      toast.success("密码修改成功，请重新登录");
      setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, 1000);
    } catch {
      toast.error("网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="space-y-1.5">
        <label className="text-xs font-medium">当前密码</label>
        <Input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="输入当前使用的密码"
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">新密码（至少 8 位）</label>
        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="至少包含 8 个字符"
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">确认新密码</label>
        <Input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="再次输入新密码"
          required
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            修改中...
          </>
        ) : (
          <>
            <KeyRound className="w-3.5 h-3.5 mr-1.5" />
            修改密码
          </>
        )}
      </Button>
    </form>
  );
}
