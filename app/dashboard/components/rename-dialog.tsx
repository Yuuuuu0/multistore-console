"use client";

import { useState } from "react";
import { Edit2 } from "lucide-react";

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

type RenameDialogProps = {
  open: boolean;
  currentName: string;
  onClose: () => void;
  onSubmit: InputDialogSubmit;
};

function RenameDialogBody({
  currentName,
  onClose,
  onSubmit,
}: {
  currentName: string;
  onClose: () => void;
  onSubmit: InputDialogSubmit;
}) {
  const [value, setValue] = useState(currentName);

  return (
    <>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit(value)}
        className="font-mono text-sm"
        autoFocus
      />
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose}>
          取消
        </Button>
        <Button size="sm" onClick={() => onSubmit(value)}>
          确认
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * 对象或目录重命名对话框
 */
export function RenameDialog({
  open,
  currentName,
  onClose,
  onSubmit,
}: RenameDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen: boolean) => !nextOpen && onClose()}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-primary" />
            <DialogTitle className="text-base">重命名</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            输入新的对象或文件夹名称
          </DialogDescription>
        </DialogHeader>
        {open && (
          <RenameDialogBody
            key={currentName}
            currentName={currentName}
            onClose={onClose}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
