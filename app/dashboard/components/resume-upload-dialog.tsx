"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ResumeInfo } from "../lib/multipart-upload";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

type ResumeUploadDialogProps = {
  open: boolean;
  resumeInfo: ResumeInfo | null;
  onResume: () => void;
  onRestart: () => void;
  onClose: () => void;
};

export function ResumeUploadDialog({ open, resumeInfo, onResume, onRestart, onClose }: ResumeUploadDialogProps) {
  if (!resumeInfo) return null;

  const percent = resumeInfo.totalParts > 0
    ? Math.round((resumeInfo.completedParts.length / resumeInfo.totalParts) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>检测到未完成的上传</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">文件</span>
            <span className="font-medium truncate max-w-[240px]">{resumeInfo.fileName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">大小</span>
            <span>{formatSize(resumeInfo.fileSize)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">已完成</span>
            <span>
              {resumeInfo.completedParts.length}/{resumeInfo.totalParts} 分片 ({percent}%)
            </span>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onRestart}>重新上传</Button>
          <Button onClick={onResume}>续传</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
