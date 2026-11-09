"use client";

import { CheckSquare, Cloud, Loader2, Server, Square } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

import type { Provider, ProviderFormData } from "../lib/file-utils";

type ProviderDialogProps = {
  open: boolean;
  provider: Provider | null;
  formData: ProviderFormData;
  availableBuckets: string[];
  selectedBuckets: string[];
  testingConnection: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onTestConnection: () => void;
  onFormDataChange: (next: ProviderFormData) => void;
  onToggleBucket: (bucket: string) => void;
};

/**
 * 存储商节点添加与编辑配置对话框
 */
export function ProviderDialog({
  open,
  provider,
  formData,
  availableBuckets,
  selectedBuckets,
  testingConnection,
  onClose,
  onSubmit,
  onTestConnection,
  onFormDataChange,
  onToggleBucket,
}: ProviderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen: boolean) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                {provider ? "编辑存储商节点" : "添加存储商节点"}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                配置 S3 / OSS / COS 访问凭证并挂载需要纳管的存储桶
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="flex-1 overflow-y-auto p-6 space-y-4 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">节点名称 *</label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  onFormDataChange({ ...formData, name: e.target.value })
                }
                placeholder="例如：生产环境 AWS S3"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">协议类型 *</label>
              <select
                className="w-full h-9 border border-input rounded-md px-3 py-1 text-sm bg-transparent dark:bg-input/30 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                value={formData.type}
                onChange={(e) =>
                  onFormDataChange({ ...formData, type: e.target.value })
                }
              >
                <option value="s3">AWS S3</option>
                <option value="oss">阿里云 OSS</option>
                <option value="cos">腾讯云 COS</option>
                <option value="custom">其他 S3 兼容</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Access Key ID *</label>
            <Input
              value={formData.accessKeyId}
              onChange={(e) =>
                onFormDataChange({ ...formData, accessKeyId: e.target.value })
              }
              placeholder="输入 Access Key ID"
              className="font-mono"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">
              Secret Access Key {provider ? "(留空保持不变)" : "*"}
            </label>
            <Input
              type="password"
              value={formData.secretAccessKey}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  secretAccessKey: e.target.value,
                })
              }
              placeholder={provider ? "••••••••••••" : "输入 Secret Access Key"}
              className="font-mono"
              required={!provider}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Endpoint</label>
              <Input
                value={formData.endpoint}
                onChange={(e) =>
                  onFormDataChange({ ...formData, endpoint: e.target.value })
                }
                placeholder="https://oss-cn-hangzhou.aliyuncs.com"
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                Region {formData.type === "oss" && "(OSS 可选)"}
              </label>
              <Input
                value={formData.region}
                onChange={(e) =>
                  onFormDataChange({ ...formData, region: e.target.value })
                }
                placeholder={
                  formData.type === "oss"
                    ? "可从 Endpoint 自动推断"
                    : "例如：us-east-1"
                }
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onTestConnection}
              disabled={
                testingConnection ||
                !formData.accessKeyId ||
                !formData.secretAccessKey
              }
              className="w-full h-9 text-xs"
            >
              {testingConnection ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  连接中...
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 mr-2 text-primary" />
                  测试连接并获取存储桶
                </>
              )}
            </Button>
          </div>

          {(availableBuckets.length > 0 || selectedBuckets.length > 0) && (
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">选择纳管存储桶 *</label>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  已选择 {selectedBuckets.length} 个存储桶
                </Badge>
              </div>
              <div className="max-h-44 overflow-y-auto border rounded-md bg-background p-1.5 space-y-1">
                {Array.from(
                  new Set([...availableBuckets, ...selectedBuckets]),
                ).map((bucket) => {
                  const checked = selectedBuckets.includes(bucket);
                  return (
                    <button
                      key={bucket}
                      type="button"
                      onClick={() => onToggleBucket(bucket)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded text-left text-xs font-mono transition-colors ${
                        checked
                          ? "bg-primary/10 text-foreground font-medium"
                          : "hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {checked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="truncate">{bucket}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              取消
            </Button>
            <Button type="submit" className="flex-1">
              {provider ? "更新" : "添加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
