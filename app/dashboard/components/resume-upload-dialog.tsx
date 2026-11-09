"use client";

import { RotateCcw, UploadCloud } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ResumeInfo } from "../lib/multipart-upload";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

type ResumeUploadDialogProps = {
  open: boolean;
  resumeInfo: ResumeInfo | null;
  onResume: () => void;
  onRestart: () => void;
  onClose: () => void;
};

/**
 * 大文件断点续传检测与恢复确认对话框
 */
export function ResumeUploadDialog({
  open,
  resumeInfo,
  onResume,
  onRestart,
  onClose,
}: ResumeUploadDialogProps) {
  if (!resumeInfo) return null;

  const percent =
    resumeInfo.totalParts > 0
      ? Math.round(
          (resumeInfo.completedParts.length / resumeInfo.totalParts) * 100,
        )
      : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-primary" />
            <DialogTitle className="text-base">检测到未完成的上传</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            发现本地保存的分片上传断点记录，可从上次中断位置继续上传
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/25 p-3.5 space-y-2.5 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground shrink-0">文件名称</span>
            <span className="font-mono font-medium truncate">
              {resumeInfo.fileName}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground shrink-0">文件大小</span>
            <span className="font-mono">{formatSize(resumeInfo.fileSize)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground shrink-0">已完成分片</span>
            <span className="font-mono text-primary font-semibold">
              {resumeInfo.completedParts.length}/{resumeInfo.totalParts} 分片 (
              {percent}%)
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onRestart}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            重新上传
          </Button>
          <Button size="sm" onClick={onResume}>
            <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
            续传
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
