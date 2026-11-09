import Link from "next/link";
import { ArrowLeft, Lock, Settings, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sidebar } from "../dashboard/components/sidebar";
import { PasswordChangeForm } from "./password-form";
import { GitHubBindingForm } from "./github-form";

export default async function SettingsPage() {
  return (
    <div className="flex flex-col lg:flex-row h-dvh overflow-hidden bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden bg-architectural-grid">
        <header className="h-14 border-b bg-card/70 backdrop-blur px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-primary" />
            <h1 className="text-base sm:text-lg font-semibold tracking-tight">
              设置
            </h1>
            <Badge
              variant="outline"
              className="font-mono text-[10px] hidden sm:inline-flex"
            >
              SECURITY & AUTHENTICATION
            </Badge>
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              返回首页
            </Button>
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 修改密码卡片 */}
            <div className="lg:col-span-5 rounded-xl border bg-card/90 backdrop-blur p-6 space-y-5 h-fit">
              <div className="space-y-1 border-b pb-4">
                <div className="flex items-center gap-2 text-primary font-mono text-[10px] uppercase tracking-widest">
                  <Lock className="w-3.5 h-3.5" />
                  <span>CREDENTIALS // 凭据安全</span>
                </div>
                <h2 className="text-lg font-semibold">修改密码</h2>
                <p className="text-xs text-muted-foreground">
                  更新本地管理员登录口令，修改成功后将自动注销当前会话
                </p>
              </div>
              <PasswordChangeForm />
            </div>

            {/* 账号关联与登录策略卡片 */}
            <div className="lg:col-span-7 rounded-xl border bg-card/90 backdrop-blur p-6 space-y-5 h-fit">
              <div className="space-y-1 border-b pb-4">
                <div className="flex items-center gap-2 text-primary font-mono text-[10px] uppercase tracking-widest">
                  <Shield className="w-3.5 h-3.5" />
                  <span>OAUTH & ACCESS // 身份联合</span>
                </div>
                <h2 className="text-lg font-semibold">账号关联</h2>
                <p className="text-xs text-muted-foreground">
                  配置 GitHub OAuth 应用、授权白名单与密码登录开关策略
                </p>
              </div>
              <GitHubBindingForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
