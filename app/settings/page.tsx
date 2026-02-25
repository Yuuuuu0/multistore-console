import { PasswordChangeForm } from "./password-form";
import { GitHubBindingForm } from "./github-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-10 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">设置</h1>
        </div>

        <div className="space-y-8">
          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-semibold mb-4">修改密码</h2>
            <div className="max-w-md">
              <PasswordChangeForm />
            </div>
          </div>

          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-semibold mb-4">账号关联</h2>
            <div className="max-w-md">
              <GitHubBindingForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
