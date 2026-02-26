"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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

export function TransferDialog({
  open,
  providers,
  selectedProvider,
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
    <Dialog open={open} onOpenChange={(nextOpen: boolean) => !nextOpen && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>跨云传输</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">文件: {transferKey.split("/").pop()}</div>
          <div>
            <label className="text-sm font-medium">目标存储商</label>
            <select
              className="w-full border rounded-md px-3 py-2 mt-1"
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
          <div>
            <label className="text-sm font-medium">目标存储桶</label>
            <select
              className="w-full border rounded-md px-3 py-2 mt-1"
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
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={onTransfer} disabled={transferring || !transferDstProvider || !transferDstBucket}>
            {transferring ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />传输中...
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
