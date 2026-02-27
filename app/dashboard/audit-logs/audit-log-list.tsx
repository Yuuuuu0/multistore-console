"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuditLogFiltersBar, type AuditLogFilters } from "./audit-log-filters";

type AuditLog = {
  id: string;
  action: string;
  status: string;
  description: string;
  userId: string;
  username: string;
  providerId?: string;
  providerName?: string;
  bucket?: string;
  ipAddress: string;
  createdAt: string;
};

const ACTION_BADGE: Record<string, { label: string; className: string }> = {
  FILE_UPLOAD:           { label: "上传",     className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  FILE_DELETE:           { label: "删除",     className: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
  FILE_BATCH_DELETE:     { label: "批量删除", className: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
  FILE_DELETE_RECURSIVE: { label: "递归删除", className: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
  FILE_RENAME:           { label: "重命名",   className: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
  FILE_COPY:             { label: "复制",     className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300" },
  FILE_DOWNLOAD:         { label: "下载",     className: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
  FILE_ZIP_DOWNLOAD:     { label: "ZIP下载",  className: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
  FOLDER_CREATE:         { label: "建文件夹", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  AUTH_LOGIN:            { label: "登录",     className: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
  AUTH_LOGOUT:           { label: "登出",     className: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
  AUTH_PASSWORD_CHANGE:  { label: "改密码",   className: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
  PROVIDER_CREATE:         { label: "添加存储商", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" },
  PROVIDER_UPDATE:         { label: "更新存储商", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" },
  PROVIDER_DELETE:         { label: "删除存储商", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" },
  PROVIDER_TEST_CONNECTION:{ label: "测试连接",   className: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" },
  TRANSFER_CREATE:       { label: "创建传输", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300" },
  TRANSFER_CANCEL:       { label: "取消传输", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300" },
};

export function AuditLogList() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [providers, setProviders] = useState<{ id: string; name: string }[]>([]);
  const [retentionDays, setRetentionDays] = useState("30");
  const [retentionSaving, setRetentionSaving] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "50" });
      if (filters.action) params.set("action", filters.action);
      if (filters.status) params.set("status", filters.status);
      if (filters.providerId) params.set("providerId", filters.providerId);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const res = await fetch(`/api/audit-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 0);
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProviders(data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/audit-logs/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.days) setRetentionDays(String(data.days));
      })
      .catch(() => {});
  }, []);

  async function handleSaveRetention() {
    const days = parseInt(retentionDays, 10);
    if (!Number.isInteger(days) || days < 1 || days > 365) return;
    setRetentionSaving(true);
    try {
      await fetch("/api/audit-logs/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
    } catch {
      // silent
    } finally {
      setRetentionSaving(false);
    }
  }

  function handleFiltersChange(next: AuditLogFilters) {
    setFilters(next);
    setPage(1);
  }

  function handleReset() {
    setFilters({});
    setPage(1);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="h-[57px] border-b px-6 flex items-center justify-between flex-shrink-0">
        <h1 className="text-lg font-semibold">审计日志</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground text-xs">保留天数</span>
          <Input
            type="number"
            min={1}
            max={365}
            value={retentionDays}
            onChange={(e) => setRetentionDays(e.target.value)}
            className="w-20 h-7 text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={retentionSaving || !retentionDays || parseInt(retentionDays, 10) < 1 || parseInt(retentionDays, 10) > 365}
            onClick={handleSaveRetention}
          >
            {retentionSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
            保存
          </Button>
        </div>
      </div>

      <AuditLogFiltersBar
        filters={filters}
        providers={providers}
        onFiltersChange={handleFiltersChange}
        onReset={handleReset}
      />

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />加载中...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            {Object.values(filters).some(Boolean) ? "没有匹配的记录" : "暂无审计日志"}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b sticky top-0 bg-background">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground w-40">时间</th>
                <th className="px-6 py-3 text-center font-medium text-muted-foreground w-28">类型</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">描述</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground w-28">存储商</th>
                <th className="px-6 py-3 text-center font-medium text-muted-foreground w-20">状态</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground w-32">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const badge = ACTION_BADGE[log.action] || { label: log.action, className: "bg-muted text-muted-foreground" };
                return (
                  <tr key={log.id} className="border-b hover:bg-muted/50">
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <Badge variant="ghost" className={`text-[11px] px-1.5 py-0.5 rounded ${badge.className}`}>
                        {badge.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 truncate max-w-xs" title={log.description}>
                      {log.description}
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {log.providerName || "--"}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <Badge variant={log.status === "SUCCESS" ? "outline" : "destructive"} className="text-[11px]">
                        {log.status === "SUCCESS" ? "成功" : "失败"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right text-xs text-muted-foreground font-mono">
                      {log.ipAddress}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 0 && (
        <div className="border-t px-6 py-3 flex items-center justify-between flex-shrink-0 text-sm">
          <span className="text-muted-foreground text-xs">共 {total} 条记录</span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-3 h-3 mr-1" />上一页
            </Button>
            <span className="text-xs text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页<ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
