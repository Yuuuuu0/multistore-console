"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{provider ? "编辑存储商" : "添加存储商"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium">名称 *</label>
            <Input
              value={formData.name}
              onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
              placeholder="例如：我的 S3"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">类型 *</label>
            <select
              className="w-full border rounded-md px-3 py-2"
              value={formData.type}
              onChange={(e) => onFormDataChange({ ...formData, type: e.target.value })}
            >
              <option value="s3">AWS S3</option>
              <option value="oss">阿里云 OSS</option>
              <option value="cos">腾讯云 COS</option>
              <option value="custom">其他 S3 兼容</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Access Key ID *</label>
            <Input
              value={formData.accessKeyId}
              onChange={(e) => onFormDataChange({ ...formData, accessKeyId: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              Secret Access Key {provider ? "(留空保持不变)" : "*"}
            </label>
            <Input
              type="password"
              value={formData.secretAccessKey}
              onChange={(e) => onFormDataChange({ ...formData, secretAccessKey: e.target.value })}
              required={!provider}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Endpoint</label>
            <Input
              value={formData.endpoint}
              onChange={(e) => onFormDataChange({ ...formData, endpoint: e.target.value })}
              placeholder="例如：https://oss-cn-hangzhou.aliyuncs.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Region {formData.type === "oss" && "(OSS 可选)"}</label>
            <Input
              value={formData.region}
              onChange={(e) => onFormDataChange({ ...formData, region: e.target.value })}
              placeholder={formData.type === "oss" ? "OSS 可从 Endpoint 自动推断" : "例如：us-east-1"}
            />
            {formData.type === "oss" && (
              <p className="text-xs text-muted-foreground mt-1">提示：OSS 可以从 Endpoint 自动推断 Region</p>
            )}
          </div>
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={onTestConnection}
              disabled={testingConnection || !formData.accessKeyId || !formData.secretAccessKey}
              className="w-full"
            >
              {testingConnection ? "连接中..." : "测试连接并获取存储桶"}
            </Button>
          </div>
          {availableBuckets.length > 0 && (
            <div>
              <label className="text-sm font-medium">选择存储桶 *</label>
              <div className="mt-2 max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                {availableBuckets.map((bucket) => (
                  <label
                    key={bucket}
                    className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBuckets.includes(bucket)}
                      onChange={() => onToggleBucket(bucket)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{bucket}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">已选择 {selectedBuckets.length} 个存储桶</p>
            </div>
          )}
          <div className="flex gap-4 pt-4">
            <Button type="submit" className="flex-1">
              {provider ? "更新" : "添加"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              取消
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
