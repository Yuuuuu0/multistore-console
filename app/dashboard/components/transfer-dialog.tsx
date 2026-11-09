"use client";

import { ArrowRightLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { Provider } from "../lib/file-utils";

type TransferDialogProps = {
  open: boolean;
  providers: Provider[];
  selectedProvider: Provider | null;
  selectedBucket: string | null;
  selectedKeys: Set<string>;
  transferKey: string;
  transferDstProvider: string;
  transferDstBucket: string;
  transferring: boolean;
  onClose: () => void;
  onTransfer: () => void;
  onChangeDstProvider: (value: string) => void;
  onChangeDstBucket: (value: string) => void;
};

/**
 * 跨云对象异步流转任务创建对话框
 */
export function TransferDialog({
  open,
  providers,
  selectedProvider,
  selectedBucket,
  transferKey,
  transferDstProvider,
  transferDstBucket,
  transferring,
  onClose,
  onTransfer,
  onChangeDstProvider,
  onChangeDstBucket,
}: TransferDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen: boolean) => !nextOpen && onClose()}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
            <DialogTitle className="text-base">跨云传输</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            将对象从当前存储桶异步复制到其他云存储节点
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <div className="text-[10px] font-mono text-muted-foreground uppercase">
              SOURCE OBJECT // 源对象
            </div>
            <div className="font-mono font-medium truncate">
              {selectedBucket ? `${selectedBucket}/` : ""}
              {transferKey.split("/").pop() || transferKey}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">目标存储商</label>
            <select
              className="w-full h-9 border border-input rounded-md px-3 py-1 text-sm bg-transparent dark:bg-input/30 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              value={transferDstProvider}
              onChange={(e) => {
                onChangeDstProvider(e.target.value);
                onChangeDstBucket("");
              }}
            >
              <option value="">选择存储商</option>
              {providers
                .filter((p) => p.id !== selectedProvider?.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">目标存储桶</label>
            <select
              className="w-full h-9 border border-input rounded-md px-3 py-1 text-sm bg-transparent dark:bg-input/30 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50"
              value={transferDstBucket}
              onChange={(e) => onChangeDstBucket(e.target.value)}
              disabled={!transferDstProvider}
            >
              <option value="">选择存储桶</option>
              {providers
                .find((p) => p.id === transferDstProvider)
                ?.buckets?.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button
            size="sm"
            onClick={onTransfer}
            disabled={transferring || !transferDstProvider || !transferDstBucket}
          >
            {transferring ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                传输中...
              </>
            ) : (
              "开始传输"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
