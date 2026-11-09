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

- Node.js 24+（Node 20 已于 2026-04-30 EOL，不再接收安全补丁）
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

## 浏览器直传与 CORS

在文件浏览器选择存储桶后，打开“直传设置”，检查当前站点的 CORS 规则；需要修改时显式应用推荐规则。小文件和大文件分片的字节均由浏览器 PUT 到对象存储，系统只处理预签名、分片创建/合并、完成确认等控制请求；失败不回退系统中转。原 `POST /api/fs/{providerId}/upload` 保留供已有客户端调用，文件浏览器不再使用它。

当前站点必须填写完整 origin（协议、主机、可选端口），例如 `https://console.example.com` 或 `http://localhost:3000`，不能带路径、结尾 `/`、凭证或 `*`。最小规则示例：

```json
{
  "AllowedOrigins": ["https://console.example.com"],
  "AllowedMethods": ["PUT", "GET", "HEAD"],
  "AllowedHeaders": ["Content-Type"],
  "ExposeHeaders": ["ETag"],
  "MaxAgeSeconds": 3600
}
```

已有 `AllowedHeaders: ["*"]` 也可使用。自动应用会先读取原配置，只合并当前精确 origin 所需能力，保留其它规则；精确规则放在前面，防止已有宽泛规则遮挡 `ETag`。云端读取、写入或回读失败会显示实际错误和手工规则，不会把权限不足当成“没有规则”后覆盖配置。不要同时在多个控制台修改同一个桶的 CORS。

### 云服务与地址设置

- **AWS S3 / 兼容服务**：凭证需具有对象上传权限；自动管理 CORS 还需要 `s3:GetBucketCORS` 和 `s3:PutBucketCORS`。无 CORS 管理权限时仍可尝试上传，或由管理员在云控制台应用上述规则。
- **阿里云 OSS**：[官方 S3 兼容清单](https://www.alibabacloud.com/help/en/oss/developer-reference/compatibility-with-amazon-s3)未列出 CORS 管理接口。S3 兼容调用不支持时，在 OSS 控制台的桶跨域设置中保留原规则并添加上述配置；原生管理权限为 `oss:GetBucketCors` / `oss:PutBucketCors`。对象直传仍使用 S3 兼容 PUT。
- **腾讯云 COS**：[官方适配指南](https://cloud.tencent.com/document/product/436/37421)要求按地域填写 endpoint，如 `https://cos.ap-guangzhou.myqcloud.com`，桶名包含 APPID。CORS 管理权限为 `cos:GetBucketCORS` / `cos:PutBucketCORS`；若服务返回不兼容或签名错误，使用 COS 控制台配置，不会报告自动修复成功。
- OSS 使用虚拟主机地址；[COS 新桶也要求虚拟主机地址](https://cloud.tencent.com/document/product/436/34688)。应按服务设置 `forcePathStyle: false`。程序保留已保存的 endpoint、region 和地址方式，不迁移已有 Provider；不要把桶域名当地域 endpoint 填写，也不要将预签名 URL 换域名或重写路径。
- 浏览器必须能直接访问 endpoint：公网部署不能使用只有系统服务器可达的内网域名，HTTPS 站点不能向不安全的 HTTP endpoint 上传。

SDK 使用 `requestChecksumCalculation: "WHEN_REQUIRED"`，避免无文件内容的预签名误签空 CRC32，以及兼容厂商不支持的默认 checksum trailer。PUT 的 `Content-Type` 纳入签名，浏览器原样使用返回的 headers。

### 排查上传失败

- 网络错误不一定是 CORS：检查浏览器网络面板中的 OPTIONS/PUT、DNS、TLS、endpoint 可达性、签名与上传权限。系统显示 HTTP 状态和存储服务提供的错误类别；不会用中转掩盖错误。
- “无法读取 ETag”表示分片 PUT 已成功，但响应头未暴露。将首条匹配本站 PUT 的 CORS 规则加入 `ExposeHeaders: ["ETag"]`，再重试或断点续传。
- 小文件 PUT 成功后调用 `POST /api/fs/{providerId}/upload-complete`（JSON `{bucket,key,fileSize}`），系统用 HeadObject 核对大小并按既有 best-effort 策略记录 `FILE_UPLOAD`。仅 PutObject 权限可能不允许 HEAD（AWS 通常需 GetObject 权限）；确认失败会提示刷新或到云控制台核对，保留对象且不重新上传。

CORS 接口：`GET /api/fs/{providerId}/cors?bucket=...&origin=...` 只读检查；`PUT` 同路径、JSON `{bucket,origin}` 显式合并。成功返回 `{origin,rules,recommendedRule,compatible,issues}`；云端错误除 `error` 外仍返回推荐规则和配置指导。CORS 检查不是上传前置条件。

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
