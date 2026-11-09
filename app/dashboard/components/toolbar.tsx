"use client";

import {
  Copy,
  FolderPlus,
  FolderUp,
  LayoutGrid,
  List,
  PackageOpen,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { ClipboardItem, S3Object } from "../lib/file-utils";
import type { UploadProgress } from "../lib/upload-queue";
import type { MultipartUploadState } from "../lib/multipart-upload";
import { MultipartProgress } from "./multipart-progress";

export type FileViewMode = "table" | "grid";

type ToolbarProps = {
  selectedKeys: Set<string>;
  objects: S3Object[];
  clipboard: ClipboardItem | null;
  prefix: string;
  selectedProvider: string | null;
  selectedBucket: string | null;
  allSelected: boolean;
  someSelected: boolean;
  searchTerm: string;
  uploadProgress: UploadProgress;
  isLoading: boolean;
  isUploading: boolean;
  multipartState: MultipartUploadState | null;
  viewMode?: FileViewMode;
  onViewModeChange?: (mode: FileViewMode) => void;
  onOpenCorsConfig?: () => void;
  onToggleSelectAll: () => void;
  onRefresh: () => void;
  onUploadClick: () => void;
  onFolderUploadClick: () => void;
  onBatchDelete: () => void;
  onBatchDownload: () => void;
  onPaste: () => void;
  onCreateFolder: () => void;
  onSearchChange: (value: string) => void;
  onCancelMultipart: () => void;
};

/**
 * 对象存储主控制台顶部命令工具栏与上传遥测反馈条
 */
export function Toolbar({
  selectedKeys,
  clipboard,
  selectedBucket,
  someSelected,
  searchTerm,
  uploadProgress,
  isLoading,
  isUploading,
  multipartState,
  viewMode = "table",
  onViewModeChange,
  onOpenCorsConfig,
  onRefresh,
  onUploadClick,
  onFolderUploadClick,
  onBatchDelete,
  onBatchDownload,
  onPaste,
  onCreateFolder,
  onSearchChange,
  onCancelMultipart,
}: ToolbarProps) {
  const progressText = isUploading
    ? `上传中 ${uploadProgress.completed + uploadProgress.failed}/${uploadProgress.total}`
    : "上传文件";
  const progressPercent =
    uploadProgress.total > 0
      ? ((uploadProgress.completed + uploadProgress.failed) /
          uploadProgress.total) *
        100
      : 0;

  return (
    <>
      <div className="min-h-14 border-b bg-card/60 backdrop-blur px-3 sm:px-4 py-2 flex flex-wrap items-center gap-2 shrink-0">
        {/* 核心动作组 */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            onClick={onUploadClick}
            disabled={!selectedBucket || isUploading}
            className="h-8 text-xs font-medium shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            {progressText}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onFolderUploadClick}
            disabled={!selectedBucket || isUploading}
            className="h-8 text-xs"
          >
            <FolderUp className="w-3.5 h-3.5 mr-1.5" />
            上传文件夹
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCreateFolder}
            disabled={!selectedBucket}
            className="h-8 text-xs"
          >
            <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
            新建文件夹
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={!selectedBucket || isLoading}
            className="h-8 text-xs"
            title="刷新当前目录"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`}
            />
            刷新
          </Button>

          {selectedBucket && onOpenCorsConfig && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenCorsConfig}
              className="h-8 text-xs border-primary/30 text-primary hover:bg-primary/10"
              title="检测或配置当前存储桶的浏览器直传 CORS 规则"
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
              直传设置
            </Button>
          )}

          {clipboard && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onPaste}
              disabled={!selectedBucket}
              className="h-8 text-xs border border-primary/25"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5 text-primary" />
              粘贴{clipboard.action === "cut" ? "(移动)" : "(复制)"}
            </Button>
          )}
        </div>

        {/* 批量选择上下文操作组 */}
        {someSelected && (
          <div className="flex items-center gap-1.5 pl-1 sm:pl-2 sm:border-l border-border">
            <Badge variant="secondary" className="h-7 px-2 font-mono text-xs">
              已选 {selectedKeys.size} 项
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={onBatchDownload}
              className="h-8 text-xs"
            >
              <PackageOpen className="w-3.5 h-3.5 mr-1.5" />
              ZIP 下载 ({selectedKeys.size})
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onBatchDelete}
              className="h-8 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              删除 ({selectedKeys.size})
            </Button>
          </div>
        )}

        <div className="flex-1 min-w-[8px]" />

        {/* 右侧搜索与视图切换 */}
        {selectedBucket && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                placeholder="筛选当前目录对象..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-8 pl-8 pr-7 text-xs bg-background/80"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="清空搜索"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {onViewModeChange && (
              <div className="inline-flex items-center rounded-md border bg-background/80 p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onViewModeChange("table")}
                  className={`p-1.5 rounded-xs transition-colors ${
                    viewMode === "table"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="列表视图"
                  aria-label="列表视图"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange("grid")}
                  className={`p-1.5 rounded-xs transition-colors ${
                    viewMode === "grid"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="矩阵卡片视图"
                  aria-label="矩阵卡片视图"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 常规文件并发上传队列进度条 */}
      {isUploading && (
        <div className="border-b bg-primary/5 px-4 py-2.5 shrink-0 space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-foreground font-medium truncate">
              正在并发上传:{" "}
              <span className="font-mono text-muted-foreground">
                {uploadProgress.currentFiles.join(", ") || "准备队列中..."}
              </span>
            </span>
            <span className="font-mono text-xs shrink-0">
              {uploadProgress.completed + uploadProgress.failed}/
              {uploadProgress.total}
              {uploadProgress.failed > 0 && (
                <span className="text-destructive ml-1.5">
                  ({uploadProgress.failed} 失败)
                </span>
              )}
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* 大文件分片上传遥测条 */}
      {multipartState && (
        <MultipartProgress
          state={multipartState}
          onCancel={onCancelMultipart}
        />
      )}
    </>
  );
}
