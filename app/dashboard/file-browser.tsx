"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardPaste,
  Cloud,
  Database,
  Edit2,
  FolderPlus,
  FolderUp,
  HardDrive,
  Plus,
  RefreshCw,
  SearchX,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import { BreadcrumbNav } from "./components/breadcrumb-nav";
import { CorsConfigDialog } from "./components/cors-config-dialog";
import { FileList } from "./components/file-list";
import { FileListSkeleton } from "./components/file-list-skeleton";
import { FolderDialog } from "./components/folder-dialog";
import { PreviewDialog } from "./components/preview-dialog";
import { ProviderDialog } from "./components/provider-dialog";
import { ProviderList } from "./components/provider-list";
import { RenameDialog } from "./components/rename-dialog";
import { ResumeUploadDialog } from "./components/resume-upload-dialog";
import { Sidebar } from "./components/sidebar";
import { Toolbar, type FileViewMode } from "./components/toolbar";
import { TransferDialog } from "./components/transfer-dialog";
import { useFileBrowser } from "./hooks/use-file-browser";

/**
 * 多云对象存储主控制台容器组件
 */
export function FileBrowser() {
  const browser = useFileBrowser();
  const [viewMode, setViewMode] = useState<FileViewMode>("table");
  const [corsDialogOpen, setCorsDialogOpen] = useState(false);
  const [corsBucketOverride, setCorsBucketOverride] = useState<string | null>(
    null,
  );

  function openCorsForBucket(bucketName?: string | null) {
    const target = bucketName || browser.selectedBucket;
    if (!target) return;
    setCorsBucketOverride(target);
    setCorsDialogOpen(true);
  }

  const blankAreaContent = (
    <>
      {!browser.selectedProvider ? (
        <div className="p-6 sm:p-10 max-w-5xl mx-auto space-y-6">
          <div className="rounded-xl border bg-card/85 backdrop-blur p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-primary">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>MULTI-CLOUD STORAGE MATRIX</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                  请从左侧选择存储商
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  选择已接入的对象存储节点，或直接点击下方节点卡片进入对应存储桶空间
                </p>
              </div>
              <Button size="sm" onClick={browser.openAddDialog}>
                <Plus className="w-4 h-4 mr-1.5" />
                添加存储商
              </Button>
            </div>

            {browser.providers.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center space-y-3 bg-background/50">
                <Cloud className="w-10 h-10 mx-auto text-muted-foreground/60" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">尚未配置任何存储商节点</p>
                  <p className="text-xs text-muted-foreground">
                    支持 AWS S3、阿里云 OSS、腾讯云 COS 及 MinIO / Cloudflare R2 等 S3 兼容存储
                  </p>
                </div>
                <Button size="sm" onClick={browser.openAddDialog}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  立即添加第一个存储商
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {browser.providers.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => browser.handleProviderSelect(provider)}
                    className="group text-left rounded-lg border bg-background/70 hover:bg-accent/50 hover:border-primary/50 p-4 transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                          {provider.name}
                        </div>
                        <Badge
                          variant="secondary"
                          className="font-mono text-[10px] uppercase"
                        >
                          {provider.type}
                        </Badge>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono text-muted-foreground pt-2 border-t border-border/60">
                      <span>纳管存储桶</span>
                      <span className="text-foreground font-semibold">
                        {provider.buckets?.length ?? 0} 个
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : !browser.selectedBucket ? (
        <div className="p-6 sm:p-10 max-w-5xl mx-auto space-y-6">
          <div className="rounded-xl border bg-card/85 backdrop-blur p-6 sm:p-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-primary">
                  <Database className="w-3.5 h-3.5" />
                  <span>{`${browser.selectedProvider.name} // BUCKETS`}</span>
                </div>
                <h2 className="text-xl font-semibold tracking-tight">
                  请选择存储桶
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  点击存储桶进入文件浏览与上传管理，也可直接检测存储桶的浏览器直传 CORS 配置
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  browser.selectedProvider &&
                  browser.openEditDialog(browser.selectedProvider)
                }
              >
                <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                管理纳管存储桶
              </Button>
            </div>

            {browser.buckets.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
                当前存储商未关联存储桶，请点击右上角「管理纳管存储桶」进行勾选
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {browser.buckets.map((bucket) => (
                  <div
                    key={bucket.Name}
                    className="group rounded-lg border bg-background/70 hover:border-primary/50 p-4 transition-all flex flex-col justify-between gap-4"
                  >
                    <button
                      type="button"
                      onClick={() => browser.handleBucketSelect(bucket.Name)}
                      className="text-left flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-primary/12 text-primary flex items-center justify-center shrink-0">
                          <Database className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-mono font-semibold text-sm truncate group-hover:text-primary transition-colors">
                            {bucket.Name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            点击浏览对象列表
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </button>

                    <div className="pt-2.5 border-t border-border/60 flex items-center justify-between gap-2">
                      <Button
                        size="xs"
                        variant="ghost"
                        className="text-[11px] font-mono text-muted-foreground hover:text-primary"
                        onClick={() => openCorsForBucket(bucket.Name)}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 mr-1 text-primary" />
                        直传设置
                      </Button>
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => browser.handleBucketSelect(bucket.Name)}
                      >
                        打开存储桶
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : browser.loading ? (
        <FileListSkeleton />
      ) : browser.objects.length === 0 ? (
        <div className="p-8 sm:p-14 max-w-xl mx-auto text-center space-y-5">
          <div className="rounded-xl border border-dashed bg-card/60 p-8 sm:p-10 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-primary/12 text-primary flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold">此目录为空</p>
              <p className="text-xs text-muted-foreground">
                拖放文件到此处上传，或使用下方快捷操作创建目录与上传文件
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Button size="sm" onClick={browser.handleUploadClick}>
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                上传文件
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={browser.handleFolderUploadClick}
              >
                <FolderUp className="w-3.5 h-3.5 mr-1.5" />
                上传文件夹
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  browser.setFolderName("");
                  browser.setFolderDialogOpen(true);
                }}
              >
                <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
                新建文件夹
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openCorsForBucket(browser.selectedBucket)}
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-primary" />
                直传设置
              </Button>
            </div>
          </div>
        </div>
      ) : browser.filteredObjects.length === 0 ? (
        <div className="p-12 text-center space-y-3">
          <SearchX className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">没有匹配的文件</p>
          <Button
            size="xs"
            variant="outline"
            onClick={() => browser.setSearchQuery("")}
          >
            清空搜索条件
          </Button>
        </div>
      ) : (
        <FileList
          objects={browser.filteredObjects}
          selectedKeys={browser.selectedKeys}
          prefix={browser.currentPrefix}
          providers={browser.providers}
          allSelected={browser.allSelected}
          selectedProvider={browser.selectedProvider}
          selectedBucket={browser.selectedBucket}
          nextToken={browser.nextToken}
          loadingMore={browser.loadingMore}
          viewMode={viewMode}
          onToggleSelect={browser.toggleSelect}
          onToggleSelectAll={browser.toggleSelectAll}
          onFolderClick={browser.handleFolderClick}
          onDownload={browser.handleDownload}
          onDelete={browser.handleDeleteFile}
          onRename={browser.openRenameDialog}
          onCopy={browser.handleCopy}
          onCut={browser.handleCut}
          onPreview={browser.openPreview}
          onOpenTransfer={browser.openTransferDialog}
          onLoadMore={browser.handleLoadMore}
        />
      )}
    </>
  );

  return (
    <div
      className="flex flex-col lg:flex-row h-dvh overflow-hidden bg-background"
      onDragEnter={browser.handleDragEnter}
      onDragLeave={browser.handleDragLeave}
      onDragOver={browser.handleDragOver}
      onDrop={browser.handleDrop}
    >
      <Sidebar>
        <ProviderList
          providers={browser.providers}
          selectedProvider={browser.selectedProvider}
          selectedBucket={browser.selectedBucket}
          buckets={browser.buckets}
          onProviderSelect={browser.handleProviderSelect}
          onBucketSelect={browser.handleBucketSelect}
          onAddProvider={browser.openAddDialog}
          onEditProvider={browser.openEditDialog}
          onDeleteProvider={browser.handleDeleteProvider}
          onOpenCorsConfig={(bucketName) => openCorsForBucket(bucketName)}
        />
      </Sidebar>

      <div className="flex-1 flex flex-col overflow-hidden relative bg-architectural-grid">
        {browser.showSecurityBanner && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center gap-2 text-xs sm:text-sm text-amber-700 dark:text-amber-300 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              你正在使用默认密码，请尽快前往
              <Link href="/settings" className="underline font-semibold mx-1">
                设置页面
              </Link>
              修改密码或绑定 GitHub 登录。
            </span>
          </div>
        )}

        {browser.dragOver && browser.selectedBucket && (
          <div className="absolute inset-2 z-50 bg-primary/15 backdrop-blur-xs border-2 border-dashed border-primary rounded-xl flex items-center justify-center pointer-events-none">
            <div className="bg-card border rounded-xl p-8 shadow-xl text-center space-y-2">
              <Upload className="w-10 h-10 mx-auto text-primary animate-bounce" />
              <p className="text-base font-semibold">拖放文件或目录到此处上传</p>
              <p className="text-xs font-mono text-muted-foreground">
                目标路径: {browser.selectedBucket}/
                {browser.currentPrefix || "根目录"}
              </p>
            </div>
          </div>
        )}

        <Toolbar
          selectedKeys={browser.selectedKeys}
          objects={browser.objects}
          clipboard={browser.clipboard}
          prefix={browser.currentPrefix}
          selectedProvider={browser.selectedProvider?.id || null}
          selectedBucket={browser.selectedBucket}
          allSelected={browser.allSelected}
          someSelected={browser.someSelected}
          searchTerm={browser.searchQuery}
          uploadProgress={browser.uploadProgress}
          isLoading={browser.loading}
          isUploading={browser.uploading}
          multipartState={browser.multipartState}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onOpenCorsConfig={() => openCorsForBucket(browser.selectedBucket)}
          onToggleSelectAll={browser.toggleSelectAll}
          onRefresh={() =>
            browser.selectedBucket &&
            browser.loadObjects(browser.selectedBucket, browser.currentPrefix)
          }
          onUploadClick={browser.handleUploadClick}
          onFolderUploadClick={browser.handleFolderUploadClick}
          onBatchDelete={browser.handleBatchDelete}
          onBatchDownload={browser.handleBatchDownload}
          onPaste={browser.handlePaste}
          onCreateFolder={() => {
            browser.setFolderName("");
            browser.setFolderDialogOpen(true);
          }}
          onSearchChange={browser.setSearchQuery}
          onCancelMultipart={browser.cancelMultipartUpload}
        />

        <BreadcrumbNav
          selectedBucket={browser.selectedBucket}
          breadcrumbs={browser.breadcrumbs}
          providerName={browser.selectedProvider?.name}
          objectCount={browser.filteredObjects.length}
          onBreadcrumbClick={browser.handleBreadcrumbClick}
          onOpenCorsConfig={() => openCorsForBucket(browser.selectedBucket)}
        />

        {browser.selectedBucket ? (
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div className="flex-1 overflow-auto">{blankAreaContent}</div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
              <ContextMenuItem onClick={browser.handleUploadClick}>
                <Upload className="w-4 h-4 mr-2" />
                上传文件
              </ContextMenuItem>
              <ContextMenuItem onClick={browser.handleFolderUploadClick}>
                <FolderUp className="w-4 h-4 mr-2" />
                上传文件夹
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => {
                  browser.setFolderName("");
                  browser.setFolderDialogOpen(true);
                }}
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                新建文件夹
              </ContextMenuItem>
              {browser.clipboard && (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={browser.handlePaste}>
                    <ClipboardPaste className="w-4 h-4 mr-2" />
                    粘贴{browser.clipboard.action === "cut" ? "(移动)" : "(复制)"}
                  </ContextMenuItem>
                </>
              )}
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => openCorsForBucket(browser.selectedBucket)}
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                直传设置 (CORS)
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() =>
                  browser.selectedBucket &&
                  browser.loadObjects(
                    browser.selectedBucket,
                    browser.currentPrefix,
                  )
                }
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ) : (
          <div className="flex-1 overflow-auto">{blankAreaContent}</div>
        )}
      </div>

      <PreviewDialog
        previewData={browser.preview}
        previewFileName={browser.previewFileName}
        open={!!browser.preview}
        onClose={() => browser.setPreview(null)}
        onDownload={browser.handleDownload}
      />
      <RenameDialog
        open={browser.renameDialogOpen}
        currentName={browser.renameValue}
        onClose={() => browser.setRenameDialogOpen(false)}
        onSubmit={browser.handleRename}
      />
      <FolderDialog
        open={browser.folderDialogOpen}
        onClose={() => browser.setFolderDialogOpen(false)}
        onSubmit={browser.handleCreateFolder}
      />
      <TransferDialog
        open={browser.transferDialogOpen}
        providers={browser.providers}
        selectedProvider={browser.selectedProvider}
        selectedBucket={browser.selectedBucket}
        selectedKeys={browser.selectedKeys}
        transferKey={browser.transferKey}
        transferDstProvider={browser.transferDstProvider}
        transferDstBucket={browser.transferDstBucket}
        transferring={browser.transferring}
        onClose={() => browser.setTransferDialogOpen(false)}
        onTransfer={browser.handleTransfer}
        onChangeDstProvider={browser.setTransferDstProvider}
        onChangeDstBucket={browser.setTransferDstBucket}
      />
      <ProviderDialog
        open={browser.dialogOpen}
        provider={browser.editingProvider}
        formData={browser.formData}
        availableBuckets={browser.availableBuckets}
        selectedBuckets={browser.selectedBuckets}
        testingConnection={browser.testingConnection}
        onClose={() => browser.setDialogOpen(false)}
        onSubmit={browser.handleSubmit}
        onTestConnection={browser.handleTestConnection}
        onFormDataChange={browser.setFormData}
        onToggleBucket={browser.toggleBucket}
      />
      <ResumeUploadDialog
        open={browser.resumeDialogOpen}
        resumeInfo={browser.pendingResumeInfo}
        onResume={browser.handleResumeUpload}
        onRestart={browser.handleRestartUpload}
        onClose={() => browser.setResumeDialogOpen(false)}
      />
      <CorsConfigDialog
        open={corsDialogOpen}
        providerId={browser.selectedProvider?.id || null}
        providerName={browser.selectedProvider?.name}
        bucket={corsBucketOverride || browser.selectedBucket}
        onClose={() => setCorsDialogOpen(false)}
      />
    </div>
  );
}
