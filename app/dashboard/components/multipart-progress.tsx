"use client";

import { Activity, Cpu, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

type MultipartProgressProps = {
  state: MultipartUploadState;
  onCancel: () => void;
};

/**
 * 大文件分片上传实时遥测与分片矩阵组件
 */
export function MultipartProgress({ state, onCancel }: MultipartProgressProps) {
  const percent =
    state.fileSize > 0
      ? Math.round((state.uploadedBytes / state.fileSize) * 100)
      : 0;

  const statusText =
    state.status === "preparing"
      ? "正在初始化分片任务..."
      : state.status === "completing"
        ? "正在合并云端分片..."
        : state.status === "cancelled"
          ? "分片上传已取消"
          : state.status === "failed"
            ? "分片上传异常中断"
            : `分片直传中 // ${state.fileName}`;

  return (
    <div className="border-b bg-card/80 backdrop-blur px-4 py-3 shrink-0 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Cpu className="w-4 h-4 text-primary animate-pulse shrink-0" />
          <span className="font-medium truncate max-w-md">{statusText}</span>
          <Badge variant="outline" className="font-mono text-[10px] h-4 px-1.5">
            MULTIPART IO
          </Badge>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
          <span>
            {formatSize(state.uploadedBytes)} / {formatSize(state.fileSize)}
          </span>
          <span className="text-foreground font-semibold">{percent}%</span>
        </div>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden p-0.5">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            state.status === "failed"
              ? "bg-destructive"
              : state.status === "completing"
                ? "bg-primary animate-pulse"
                : "bg-primary"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-muted-foreground">
        <span>
          PARTS: {state.completedParts.length}/{state.totalParts}
        </span>
        {state.speed > 0 && state.status === "uploading" && (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Activity className="w-3 h-3" />
            {formatSize(state.speed)}/s
          </span>
        )}
        {state.estimatedRemaining > 0 && state.status === "uploading" && (
          <span>ETA: {formatDuration(state.estimatedRemaining)}</span>
        )}
        <div className="flex-1" />
        {(state.status === "uploading" || state.status === "preparing") && (
          <Button
            size="xs"
            variant="ghost"
            className="h-6 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onCancel}
          >
            <XCircle className="w-3.5 h-3.5 mr-1" />
            取消上传
          </Button>
        )}
      </div>

      {state.totalParts <= 120 && state.parts.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {state.parts.map((part) => (
            <div
              key={part.partNumber}
              className={`w-2.5 h-2.5 rounded-[2px] transition-colors ${
                part.status === "completed"
                  ? "bg-primary"
                  : part.status === "uploading"
                    ? "bg-amber-400 animate-pulse"
                    : part.status === "failed"
                      ? "bg-destructive"
                      : "bg-muted-foreground/20"
              }`}
              title={`分片 #${part.partNumber}: ${part.status}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
