import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto py-10 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">关于</h1>
        </div>

        <div className="space-y-6">
          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-semibold mb-2">MultiStore Console</h2>
            <p className="text-muted-foreground">
              自托管的多云对象存储 Web 控制台，支持 AWS S3、阿里云 OSS、腾讯云 COS
              及其他 S3 兼容存储服务。在一个统一界面中管理多个云存储提供商的存储桶和文件。
            </p>
          </div>

          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-semibold mb-3">项目信息</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex">
                <dt className="w-24 text-muted-foreground flex-shrink-0">版本</dt>
                <dd>0.1.0</dd>
              </div>
              <div className="flex">
                <dt className="w-24 text-muted-foreground flex-shrink-0">许可证</dt>
                <dd>MIT</dd>
              </div>
              <div className="flex">
                <dt className="w-24 text-muted-foreground flex-shrink-0">GitHub</dt>
                <dd>
                  <a
                    href="https://github.com/Yuuuuu0/multistore-console"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Yuuuuu0/multistore-console
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-semibold mb-3">技术栈</h2>
            <div className="flex flex-wrap gap-2">
              {[
                "Next.js 16",
                "TypeScript",
                "SQLite",
                "Prisma",
                "NextAuth.js",
                "AWS SDK v3",
                "Tailwind CSS",
                "shadcn/ui",
                "Zustand",
              ].map((tech) => (
                <span
                  key={tech}
                  className="px-2.5 py-1 rounded-md bg-muted text-muted-foreground text-xs"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}
