"use client";

import { Button } from "@/components/ui/button";
import type { MultipartUploadState } from "../lib/multipart-upload";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`;
}

type MultipartProgressProps = {
  state: MultipartUploadState;
  onCancel: () => void;
};

export function MultipartProgress({ state, onCancel }: MultipartProgressProps) {
  const percent = state.fileSize > 0
    ? Math.round((state.uploadedBytes / state.fileSize) * 100)
    : 0;

  const statusText = state.status === "preparing"
    ? "准备中..."
    : state.status === "completing"
      ? "正在合并分片..."
      : state.status === "cancelled"
        ? "已取消"
        : state.status === "failed"
          ? "上传失败"
          : null;

  return (
    <div className="border-b px-4 py-3 flex-shrink-0 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground truncate max-w-xs">
          {statusText || `正在上传: ${state.fileName}`}
        </span>
        <span className="text-muted-foreground">
          {formatSize(state.uploadedBytes)} / {formatSize(state.fileSize)} ({percent}%)
        </span>
      </div>

      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            state.status === "failed" ? "bg-destructive" :
            state.status === "completing" ? "bg-primary animate-pulse" :
            "bg-primary"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>分片: {state.completedParts.length}/{state.totalParts}</span>
        {state.speed > 0 && state.status === "uploading" && (
          <span>{formatSize(state.speed)}/s</span>
        )}
        {state.estimatedRemaining > 0 && state.status === "uploading" && (
          <span>剩余: {formatDuration(state.estimatedRemaining)}</span>
        )}
        <div className="flex-1" />
        {(state.status === "uploading" || state.status === "preparing") && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs text-destructive hover:text-destructive"
            onClick={onCancel}
          >
            取消上传
          </Button>
        )}
      </div>

      {state.totalParts <= 100 && state.parts.length > 0 && (
        <div className="flex flex-wrap gap-0.5">
          {state.parts.map((part) => (
            <div
              key={part.partNumber}
              className={`w-2.5 h-2.5 rounded-sm ${
                part.status === "completed" ? "bg-primary" :
                part.status === "uploading" ? "bg-primary/50 animate-pulse" :
                part.status === "failed" ? "bg-destructive" :
                "bg-muted-foreground/20"
              }`}
              title={`分片 ${part.partNumber}: ${part.status}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
