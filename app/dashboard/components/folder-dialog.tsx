"use client";

import { useState } from "react";
import { FolderPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import type { InputDialogSubmit } from "../lib/file-utils";

type FolderDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: InputDialogSubmit;
};

function FolderDialogBody({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: InputDialogSubmit;
}) {
  const [value, setValue] = useState("");

  return (
    <>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && value.trim() && onSubmit(value)}
        placeholder="输入文件夹名称"
        className="font-mono text-sm"
        autoFocus
      />
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose}>
          取消
        </Button>
        <Button
          size="sm"
          onClick={() => onSubmit(value)}
          disabled={!value.trim()}
        >
          创建
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * 新建文件夹对话框
 */
export function FolderDialog({ open, onClose, onSubmit }: FolderDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen: boolean) => !nextOpen && onClose()}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-primary" />
            <DialogTitle className="text-base">新建文件夹</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            在当前路径下创建新的目录前缀
          </DialogDescription>
        </DialogHeader>
        {open && <FolderDialogBody onClose={onClose} onSubmit={onSubmit} />}
      </DialogContent>
    </Dialog>
  );
}
