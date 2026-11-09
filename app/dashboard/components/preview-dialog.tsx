"use client";

import { Download, Eye, File, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { PreviewData } from "../lib/file-utils";

type PreviewDialogProps = {
  previewData: PreviewData | null;
  previewFileName: string;
  open: boolean;
  onClose: () => void;
  onDownload: (key: string) => void;
};

/**
 * 多模态对象在线预览对话框（支持图像、视频、音频、PDF 与代码/文本）
 */
export function PreviewDialog({
  previewData,
  previewFileName,
  open,
  onClose,
  onDownload,
}: PreviewDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="sm:max-w-4xl max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 py-3.5 border-b bg-muted/30 flex flex-row items-center justify-between space-y-0 pr-12">
          <div className="flex items-center gap-2.5 min-w-0">
            <Eye className="w-4 h-4 text-primary shrink-0" />
            <DialogTitle className="text-sm font-mono font-medium truncate">
              {previewFileName}
            </DialogTitle>
            {previewData?.type && (
              <Badge
                variant="secondary"
                className="text-[10px] font-mono uppercase shrink-0"
              >
                {previewData.type}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-0 bg-architectural-grid">
          {previewData?.loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs font-mono">正在读取对象内容...</span>
            </div>
          ) : previewData?.type === "image" && previewData.url ? (
            <div className="flex items-center justify-center p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewData.url}
                alt={previewFileName}
                className="max-w-full max-h-[68vh] object-contain rounded-md border shadow-sm bg-background"
              />
            </div>
          ) : previewData?.type === "video" && previewData.url ? (
            <div className="flex items-center justify-center p-6">
              <video
                src={previewData.url}
                controls
                className="max-w-full max-h-[68vh] rounded-md border shadow-sm bg-black"
              />
            </div>
          ) : previewData?.type === "audio" && previewData.url ? (
            <div className="flex items-center justify-center p-12">
              <audio src={previewData.url} controls className="w-full max-w-md" />
            </div>
          ) : previewData?.type === "pdf" && previewData.url ? (
            <iframe
              src={previewData.url}
              className="w-full h-[70vh] border-0"
              title={previewFileName}
            />
          ) : previewData?.type === "text" &&
            previewData.content !== undefined ? (
            <pre className="p-5 bg-card/90 text-xs leading-relaxed overflow-auto max-h-[68vh] whitespace-pre-wrap break-words font-mono">
              {previewData.content}
            </pre>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <File className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-foreground">
                此文件类型暂不支持在线预览
              </p>
              <Button
                size="sm"
                onClick={() => {
                  if (previewData) onDownload(previewData.key);
                  onClose();
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                下载文件
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-3 border-t bg-muted/20">
          {previewData && previewData.type !== "unsupported" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDownload(previewData.key)}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              下载
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
