"use client";

import { Download, File } from "lucide-react";

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
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{previewFileName}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto min-h-0">
          {previewData?.loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">加载中...</div>
          ) : previewData?.type === "image" && previewData.url ? (
            <div className="flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewData.url}
                alt={previewFileName}
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            </div>
          ) : previewData?.type === "video" && previewData.url ? (
            <div className="flex items-center justify-center p-4">
              <video src={previewData.url} controls className="max-w-full max-h-[70vh] rounded" />
            </div>
          ) : previewData?.type === "audio" && previewData.url ? (
            <div className="flex items-center justify-center p-8">
              <audio src={previewData.url} controls className="w-full max-w-md" />
            </div>
          ) : previewData?.type === "pdf" && previewData.url ? (
            <iframe src={previewData.url} className="w-full h-[70vh] rounded border" title={previewFileName} />
          ) : previewData?.type === "text" && previewData.content !== undefined ? (
            <pre className="p-4 bg-muted rounded text-xs leading-relaxed overflow-auto max-h-[70vh] whitespace-pre-wrap break-words font-mono">
              {previewData.content}
            </pre>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-muted-foreground">
              <File className="w-12 h-12" />
              <p>此文件类型暂不支持预览</p>
              <Button
                onClick={() => {
                  if (previewData) onDownload(previewData.key);
                  onClose();
                }}
              >
                <Download className="w-4 h-4 mr-2" />下载文件
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          {previewData && previewData.type !== "unsupported" && (
            <Button variant="outline" onClick={() => onDownload(previewData.key)}>
              <Download className="w-4 h-4 mr-2" />下载
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
