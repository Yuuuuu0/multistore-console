"use client";

import { Copy, FolderPlus, PackageOpen, RefreshCw, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { ClipboardItem, S3Object } from "../lib/file-utils";

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
  uploadProgress: { current: number; total: number; fileName: string };
  isLoading: boolean;
  isUploading: boolean;
  onToggleSelectAll: () => void;
  onRefresh: () => void;
  onUploadClick: () => void;
  onBatchDelete: () => void;
  onBatchDownload: () => void;
  onPaste: () => void;
  onCreateFolder: () => void;
  onSearchChange: (value: string) => void;
};

export function Toolbar({
  selectedKeys,
  clipboard,
  selectedBucket,
  someSelected,
  searchTerm,
  uploadProgress,
  isLoading,
  isUploading,
  onRefresh,
  onUploadClick,
  onBatchDelete,
  onBatchDownload,
  onPaste,
  onCreateFolder,
  onSearchChange,
}: ToolbarProps) {
  return (
    <>
      <div className="h-[57px] border-b px-4 flex items-center gap-2 flex-shrink-0">
        <Button size="sm" variant="outline" onClick={onRefresh} disabled={!selectedBucket || isLoading}>
          <RefreshCw className="w-4 h-4 mr-2" />刷新
        </Button>
        <Button size="sm" onClick={onUploadClick} disabled={!selectedBucket || isUploading}>
          <Upload className="w-4 h-4 mr-2" />
          {isUploading ? `${uploadProgress.current}/${uploadProgress.total}` : "上传"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCreateFolder} disabled={!selectedBucket}>
          <FolderPlus className="w-4 h-4 mr-2" />新建文件夹
        </Button>
        {clipboard && (
          <Button size="sm" variant="outline" onClick={onPaste} disabled={!selectedBucket}>
            <Copy className="w-4 h-4 mr-2" />粘贴{clipboard.action === "cut" ? "(移动)" : "(复制)"}
          </Button>
        )}
        {someSelected && (
          <>
            <Button size="sm" variant="outline" onClick={onBatchDownload}>
              <PackageOpen className="w-4 h-4 mr-2" />ZIP 下载 ({selectedKeys.size})
            </Button>
            <Button size="sm" variant="destructive" onClick={onBatchDelete}>
              <Trash2 className="w-4 h-4 mr-2" />删除 ({selectedKeys.size})
            </Button>
          </>
        )}
        <div className="flex-1" />
        {selectedBucket && (
          <Input
            placeholder="搜索文件..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-48 h-8 text-sm"
          />
        )}
      </div>
      {isUploading && (
        <div className="border-b px-4 py-2 flex-shrink-0">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              正在上传: {uploadProgress.fileName} ({uploadProgress.current}/{uploadProgress.total})
            </span>
          </div>
          <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{
                width: `${
                  uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total) * 100 : 0
                }%`,
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
