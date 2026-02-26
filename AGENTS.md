# AGENTS.md — multistore-console

多云对象存储管理控制台。Next.js 16 App Router + TypeScript + Prisma (SQLite) + NextAuth + shadcn/ui + Tailwind CSS v4。

---

## 构建 / 测试 / 运行命令

```bash
pnpm install              # 安装依赖
pnpm dev                  # 启动开发服务器
pnpm build                # 生产构建
pnpm lint                 # ESLint 检查
pnpm test                 # 运行全部测试 (vitest run)
pnpm test:watch           # 监听模式测试

# 运行单个测试文件
pnpm vitest run lib/crypto.test.ts
pnpm vitest run lib/storage/adapter.test.ts

# 运行匹配名称的测试
pnpm vitest run -t "encrypt and decrypt"

# Prisma
npx prisma generate       # 生成客户端
npx prisma db push        # 同步 schema 到数据库
npx prisma studio         # 数据库可视化
```

---

## 项目结构

```
app/
  api/                    # API Routes (RESTful)
    auth/[...nextauth]/   # NextAuth 认证
    providers/            # 存储提供商 CRUD
    fs/[providerId]/      # 文件系统操作 (list, upload, delete, rename, copy, mkdir...)
    user/                 # 用户管理 (profile, password, github)
    transfers/            # 传输任务
  dashboard/              # 主页面 (文件浏览器)
  settings/               # 设置页面 (提供商管理、密码、GitHub)
  login/                  # 登录页面
lib/
  storage/                # S3 客户端工厂 + StorageAdapter 类
  auth.ts                 # getServerSession 封装
  crypto.ts               # AES-256-GCM 加解密
  db.ts                   # Prisma 单例
  utils.ts                # cn() = clsx + twMerge
components/
  ui/                     # shadcn/ui 组件
types/
  next-auth.d.ts          # NextAuth 类型扩展
prisma/
  schema.prisma           # 数据模型 (SQLite)
```

---

## 代码风格

### TypeScript 严格模式

- `strict: true`，禁止 `as any`、`@ts-ignore`、`@ts-expect-error`
- 数据类型用 `type` 关键字（不用 `interface`）
- 路径别名 `@/*` 映射项目根目录

### Import 顺序

```typescript
"use client";                              // 1. 客户端指令（如需要）

import { useState, useEffect } from "react"; // 2. React
import { useSession } from "next-auth/react"; // 3. Next.js / 框架
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";           // 4. 内部 lib
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

import { Button } from "@/components/ui/button"; // 5. 内部组件
import { Dialog } from "@/components/ui/dialog";

import { toast } from "sonner";              // 6. 第三方库
import { Plus, Trash2 } from "lucide-react"; // 7. 图标
```

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件/目录 | kebab-case | `file-browser.tsx`, `provider-manager.tsx` |
| 组件 | PascalCase 函数声明 | `export function FileBrowser() {}` |
| API Route | 命名导出 async 函数 | `export async function GET()` |
| 类型 | PascalCase | `type StorageObject = { ... }` |
| 变量/函数 | camelCase | `const providerList`, `function createS3Client()` |
| Prisma 模型 | PascalCase | `model Provider {}` |
| Prisma 字段 | camelCase | `accessKeyId`, `secretAccessKey` |
| 数据库 ID | UUID (`@default(uuid())`) | — |

### 组件编写

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// 用 type 定义 Props（非 interface）
type ProviderFormProps = {
  provider?: Provider;
  onSave: (data: FormData) => void;
};

// 函数声明（非箭头函数），命名导出
export function ProviderForm({ provider, onSave }: ProviderFormProps) {
  const [loading, setLoading] = useState(false);
  // ...
}
```

- 服务端组件：默认，不加 `"use client"`
- 客户端组件：需要 hooks/事件时加 `"use client"`
- 状态管理：组件内 `useState`，全局用 Context Provider
- Toast 通知：`toast.success()` / `toast.error()` (sonner)
- 样式：Tailwind 工具类 + `cn()` 合并

### API Route 编写

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. 认证检查（必须）
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. 参数校验
  const { id } = await params; // Next.js 16: params 是 Promise
  if (!id) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }

  // 3. 业务逻辑 + try-catch
  try {
    const data = await prisma.provider.findUnique({ where: { id } });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

关键规则：
- 动态路由参数必须 `await params`（Next.js 16 异步 params）
- 查询参数：`const { searchParams } = new URL(req.url)`
- 错误消息使用中文
- 响应格式：成功返回数据，失败返回 `{ error: string }`

### 错误处理

- API Route：try-catch 包裹业务逻辑，catch 返回 `{ error: e.message }` + 状态码
- 客户端：fetch 后检查 `res.ok`，失败用 `toast.error()` 提示
- 禁止空 catch 块 `catch(e) {}`

---

## 数据库 (Prisma + SQLite)

- 数据库文件：`prisma/data/console.db`
- 模型：User, Provider, Bucket, TransferTask, AppConfig
- 动态配置存 AppConfig 表（key-value），不存环境变量
- 敏感字段（secretAccessKey, github_client_secret）必须用 `encrypt()` 加密存储
- Schema 变更后执行：`npx prisma generate && npx prisma db push`

---

## 加密

- 算法：AES-256-GCM，密钥由 `ENCRYPTION_KEY` 环境变量派生（scryptSync）
- 格式：`[12-byte IV][16-byte Tag][ciphertext]` → Base64
- 使用：`import { encrypt, decrypt } from "@/lib/crypto"`
- 新增 Provider 时 secretAccessKey 必须加密

---

## 测试

- 框架：Vitest + jsdom + @testing-library/react
- 测试文件与源码同目录：`lib/crypto.test.ts`、`lib/storage/adapter.test.ts`
- 模式：`describe("模块") > it("行为")`
- Mock：`vi.mock("@aws-sdk/client-s3", () => ({ ... }))`
- 环境变量：`beforeAll` 中设置 `process.env.ENCRYPTION_KEY`

---

## 环境变量

```env
DATABASE_URL="file:./data/console.db"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
ENCRYPTION_KEY="your-encryption-key"
```

---

## 注意事项

- UI 文本和错误消息使用中文
- shadcn/ui 组件从 `@/components/ui/*` 导入，使用 new-york 风格
- Tailwind CSS v4 + oklch 颜色系统 + CSS 变量主题
- Docker 构建使用多阶段（deps → builder → runner），基于 node:20-alpine
- 首次启动自动创建 admin 用户（`lib/init.ts` → `ensureInitialized()`）
