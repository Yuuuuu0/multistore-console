# MultiStore Console

自托管的多云对象存储 Web 控制台，支持 AWS S3、阿里云 OSS、腾讯云 COS 及其他 S3 兼容存储服务。在一个统一界面中管理多个云存储提供商的存储桶和文件。

## 功能

- 多提供商管理 — 添加、编辑、删除存储提供商，支持连接测试
- 存储桶浏览 — 列出并选择提供商下的存储桶
- 文件管理 — 上传、下载、重命名、复制、移动、删除文件和文件夹
- 文件预览 — 支持图片、视频、音频、PDF、文本文件在线预览
- 拖拽上传 — 拖拽文件到浏览器即可上传，带进度显示
- 大文件分片上传 — 支持 Multipart Upload，断点续传，上传队列管理
- 批量操作 — 多选文件进行批量删除、批量 ZIP 打包下载
- 右键菜单 — 文件列表支持右键上下文菜单，快捷操作
- 跨云传输 — 在不同存储提供商之间传输文件，后台异步执行，支持传输任务列表和详情查看
- 文件搜索 — 按文件名快速过滤当前目录内容
- 文件夹递归删除 — 安全删除文件夹及其所有子内容（深度优先有序清理）
- 审计日志 — 完整操作审计追踪，可配置保留策略（1-365 天），覆盖文件、提供商、认证、传输等全部操作
- 用户认证 — 支持密码登录和 GitHub OAuth
- 凭证加密 — 存储提供商的 Access Key / Secret Key 使用 AES-256-GCM 加密存储
- Docker 部署 — 提供 Dockerfile 和 docker-compose.yml，开箱即用

## 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **数据库**: SQLite + Prisma ORM
- **认证**: NextAuth.js (JWT)
- **存储 SDK**: AWS SDK v3 (`@aws-sdk/client-s3`)
- **UI**: Tailwind CSS + Radix UI + shadcn/ui
- **状态管理**: Zustand
- **容器化**: Docker

## 支持的存储提供商

| 提供商 | 类型标识 | 说明 |
|--------|----------|------|
| AWS S3 | `s3` | Amazon Simple Storage Service |
| 阿里云 OSS | `oss` | 对象存储服务 |
| 腾讯云 COS | `cos` | 对象存储 |
| 其他 S3 兼容 | `s3` | MinIO、Cloudflare R2 等 |

## 快速开始

### 环境要求

- Node.js 18+
- npm / pnpm / yarn

### 本地开发

```bash
# 克隆项目
git clone <repo-url>
cd multistore-console

# 安装依赖
npm install

# 初始化数据库
npx prisma generate
npx prisma db push

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入实际值

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000。

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | SQLite 数据库路径 | `file:./data/console.db` |
| `NEXTAUTH_SECRET` | NextAuth 签名密钥 | 必填，随机 32 位字符串 |
| `NEXTAUTH_URL` | 应用访问地址 | `http://localhost:3000` |
| `ENCRYPTION_KEY` | 凭证加密密钥 | 必填，随机 32 位字符串 |

GitHub OAuth 配置（Client ID / Secret）在 Web 界面的设置页面中配置，无需环境变量。

> **注意**：如果使用 GitHub OAuth 单点登录，`NEXTAUTH_URL` 必须设置为实际的站点访问地址（例如 `https://console.example.com`），而非默认的 `http://localhost:3000`。否则 GitHub OAuth 回调地址不匹配，将导致登录失败。

## Docker 部署（推荐）

```bash
# 创建 docker-compose.yml 后直接启动
docker compose up -d

# 或直接使用 docker run
docker run -d -p 3000:3000 \
  -v ./data:/app/data \
  -e NEXTAUTH_SECRET=your-random-secret \
  -e ENCRYPTION_KEY=your-random-key \
  yuuuuu0/multistore-console:latest
```

访问 http://localhost:3000，首次启动会生成随机密码，通过容器日志查看：

```bash
docker compose logs multistore-console
```

用户名为 `admin`，密码在日志中显示。登录后建议立即修改密码或绑定 GitHub SSO。

`docker-compose.yml` 已包含完整配置，按需修改环境变量即可。

## 链接

- **GitHub**: [https://github.com/Yuuuuu0/multistore-console](https://github.com/Yuuuuu0/multistore-console)
- **问题反馈**: [Issues](https://github.com/Yuuuuu0/multistore-console/issues)

## License

MIT
