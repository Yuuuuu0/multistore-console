"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const ACTION_GROUPS = [
  {
    label: "文件操作",
    options: [
      { value: "FILE_UPLOAD", label: "上传" },
      { value: "FILE_DELETE", label: "删除" },
      { value: "FILE_BATCH_DELETE", label: "批量删除" },
      { value: "FILE_DELETE_RECURSIVE", label: "递归删除" },
      { value: "FILE_RENAME", label: "重命名" },
      { value: "FILE_COPY", label: "复制" },
      { value: "FILE_DOWNLOAD", label: "下载" },
      { value: "FILE_ZIP_DOWNLOAD", label: "ZIP下载" },
      { value: "FOLDER_CREATE", label: "建文件夹" },
    ],
  },
  {
    label: "认证操作",
    options: [
      { value: "AUTH_LOGIN", label: "登录" },
      { value: "AUTH_LOGOUT", label: "登出" },
      { value: "AUTH_PASSWORD_CHANGE", label: "改密码" },
    ],
  },
  {
    label: "Provider 管理",
    options: [
      { value: "PROVIDER_CREATE", label: "添加存储商" },
      { value: "PROVIDER_UPDATE", label: "更新存储商" },
      { value: "PROVIDER_DELETE", label: "删除存储商" },
      { value: "PROVIDER_TEST_CONNECTION", label: "测试连接" },
    ],
  },
  {
    label: "传输",
    options: [
      { value: "TRANSFER_CREATE", label: "创建传输" },
      { value: "TRANSFER_CANCEL", label: "取消传输" },
    ],
  },
];

export type AuditLogFilters = {
  action?: string;
  status?: string;
  providerId?: string;
  startDate?: string;
  endDate?: string;
};

type AuditLogFiltersProps = {
  filters: AuditLogFilters;
  providers: { id: string; name: string }[];
  onFiltersChange: (filters: AuditLogFilters) => void;
  onReset: () => void;
};

export function AuditLogFiltersBar({ filters, providers, onFiltersChange, onReset }: AuditLogFiltersProps) {
  function update(patch: Partial<AuditLogFilters>) {
    onFiltersChange({ ...filters, ...patch });
  }

  return (
    <div className="border-b px-6 py-3 flex items-center gap-3 flex-wrap flex-shrink-0">
      <Select value={filters.action || "ALL"} onValueChange={(v) => update({ action: v === "ALL" ? undefined : v })}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="操作类型" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">全部类型</SelectItem>
          {ACTION_GROUPS.map((group) => (
            <SelectGroup key={group.label}>
              <SelectLabel>{group.label}</SelectLabel>
              {group.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status || "ALL"} onValueChange={(v) => update({ status: v === "ALL" ? undefined : v })}>
        <SelectTrigger className="w-[100px] h-8 text-xs">
          <SelectValue placeholder="状态" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">全部状态</SelectItem>
          <SelectItem value="SUCCESS">成功</SelectItem>
          <SelectItem value="FAILURE">失败</SelectItem>
        </SelectContent>
      </Select>

      {providers.length > 0 && (
        <Select
          value={filters.providerId || "ALL"}
          onValueChange={(v) => update({ providerId: v === "ALL" ? undefined : v })}
        >
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="存储商" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部存储商</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex items-center gap-1">
        <input
          type="date"
          value={filters.startDate || ""}
          onChange={(e) => update({ startDate: e.target.value || undefined })}
          className="h-8 px-2 text-xs border rounded-md bg-background"
        />
        <span className="text-muted-foreground text-xs">~</span>
        <input
          type="date"
          value={filters.endDate || ""}
          onChange={(e) => update({ endDate: e.target.value || undefined })}
          className="h-8 px-2 text-xs border rounded-md bg-background"
        />
      </div>

      <Button size="sm" variant="ghost" onClick={onReset} className="h-7 text-xs">
        重置
      </Button>
    </div>
  );
}
