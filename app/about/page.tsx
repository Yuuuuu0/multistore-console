import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  Cpu,
  Info,
  Layers,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sidebar } from "../dashboard/components/sidebar";

export default function AboutPage() {
  return (
    <div className="flex flex-col lg:flex-row h-dvh overflow-hidden bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden bg-architectural-grid">
        <header className="h-14 border-b bg-card/70 backdrop-blur px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-primary" />
            <h1 className="text-base sm:text-lg font-semibold tracking-tight">
              关于
            </h1>
            <Badge
              variant="outline"
              className="font-mono text-[10px] hidden sm:inline-flex"
            >
              SYSTEM SPECIFICATIONS
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
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="rounded-xl border bg-card/90 backdrop-blur p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    MultiStore Console
                  </h2>
                  <p className="text-xs font-mono text-muted-foreground">
                    SELF-HOSTED MULTI-CLOUD OBJECT STORAGE CONSOLE
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                自托管的多云对象存储 Web 控制台，支持 AWS S3、阿里云 OSS、腾讯云
                COS 及其他 S3
                兼容存储服务。在一个统一界面中管理多个云存储提供商的存储桶和文件，支持预签名直传、大文件分片断点续传、CORS
                跨域规则检测与一键合并、跨云后台传输以及全量安全审计。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border bg-card/90 backdrop-blur p-6 space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-primary">
                  <Layers className="w-4 h-4" />
                  <span>PROJECT METADATA // 项目信息</span>
                </div>
                <h2 className="text-lg font-semibold">项目信息</h2>
                <dl className="space-y-3 text-sm divide-y divide-border/60">
                  <div className="flex items-center justify-between pt-2">
                    <dt className="text-muted-foreground">版本</dt>
                    <dd className="font-mono font-medium">1.0.0</dd>
                  </div>
                  <div className="flex items-center justify-between pt-3">
                    <dt className="text-muted-foreground">许可证</dt>
                    <dd className="font-mono font-medium">MIT</dd>
                  </div>
                  <div className="flex items-center justify-between pt-3">
                    <dt className="text-muted-foreground">GitHub</dt>
                    <dd>
                      <a
                        href="https://github.com/Yuuuuu0/multistore-console"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
                      >
                        <span>Yuuuuu0/multistore-console</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border bg-card/90 backdrop-blur p-6 space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-primary">
                  <Cpu className="w-4 h-4" />
                  <span>TECH STACK // 技术栈</span>
                </div>
                <h2 className="text-lg font-semibold">技术栈</h2>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    "Next.js 16",
                    "React 19",
                    "TypeScript",
                    "SQLite",
                    "Prisma",
                    "NextAuth.js",
                    "AWS SDK v3",
                    "Tailwind CSS 4",
                    "Radix UI",
                  ].map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1.5 rounded-md border bg-background/70 font-mono text-xs text-foreground"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
                <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>支持 AES-256-GCM 密钥落盘加密与 SSRF 防护校验</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
