"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  Trash2,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type TransferTask = {
  id: string;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  progress: number;
  error: string | null;
  srcProviderId: string;
  srcBucket: string;
  srcKey: string;
  dstProviderId: string;
  dstBucket: string;
  dstKey: string;
  createdAt: string;
  updatedAt: string;
};

type StatusFilter = "ALL" | "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

const STATUS_CONFIG: Record<TransferTask["status"], {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: typeof CheckCircle2;
}> = {
  QUEUED: { label: "排队中", variant: "secondary", icon: Clock },
  RUNNING: { label: "传输中", variant: "default", icon: Play },
  SUCCEEDED: { label: "成功", variant: "outline", icon: CheckCircle2 },
  FAILED: { label: "失败", variant: "destructive", icon: AlertCircle },
  CANCELLED: { label: "已取消", variant: "secondary", icon: XCircle },
};

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "全部" },
  { value: "QUEUED", label: "排队中" },
  { value: "RUNNING", label: "传输中" },
  { value: "SUCCEEDED", label: "成功" },
  { value: "FAILED", label: "失败" },
  { value: "CANCELLED", label: "已取消" },
];

export function TransferList() {
  const [tasks, setTasks] = useState<TransferTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTasks = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "ALL") params.set("status", filter);
      params.set("take", "100");
      const res = await fetch(`/api/transfers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.items || []);
      }
    } catch {
      // 静默失败，不打断轮询
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTasks(true);
  }, [fetchTasks]);

  // 自动刷新：5 秒轮询，仅页面可见时
  useEffect(() => {
    function startPolling() {
      stopPolling();
      intervalRef.current = setInterval(() => {
        if (document.visibilityState === "visible") {
          fetchTasks(false);
        }
      }, 5000);
    }

    function stopPolling() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    startPolling();
    return stopPolling;
  }, [fetchTasks]);

  async function handleDelete(taskId: string, status: TransferTask["status"]) {
    const action = status === "QUEUED" || status === "RUNNING" ? "取消" : "删除";
    if (!confirm(`确定${action}此传输任务？`)) return;
    try {
      const res = await fetch(`/api/transfers/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`${action}成功`);
        fetchTasks(false);
      } else {
        const err = await res.json().catch(() => ({} as { error?: string }));
        toast.error(err.error || `${action}失败`);
      }
    } catch {
      toast.error("网络错误");
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="h-[57px] border-b px-6 flex items-center flex-shrink-0">
        <h1 className="text-lg font-semibold">传输任务</h1>
      </div>

      {/* 状态筛选 */}
      <div className="border-b px-6 py-3 flex items-center gap-2 flex-shrink-0">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={filter === f.value ? "default" : "outline"}
            onClick={() => setFilter(f.value)}
            className="h-7 text-xs"
          >
            {f.label}
          </Button>
        ))}
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          onClick={() => fetchTasks(false)}
          className="h-7 text-xs"
        >
          刷新
        </Button>
      </div>

      {/* 任务列表 */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />加载中...
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            暂无传输任务
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b sticky top-0 bg-background">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">源文件</th>
                <th className="px-2 py-3 w-8"></th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">目标</th>
                <th className="px-6 py-3 text-center font-medium text-muted-foreground w-24">状态</th>
                <th className="px-6 py-3 text-center font-medium text-muted-foreground w-28">进度</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground w-40">创建时间</th>
                <th className="px-6 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const config = STATUS_CONFIG[task.status];
                const StatusIcon = config.icon;
                const srcFile = task.srcKey.split("/").pop() || task.srcKey;
                const dstFile = task.dstKey.split("/").pop() || task.dstKey;
                return (
                  <tr key={task.id} className="border-b hover:bg-muted/50">
                    <td className="px-6 py-3">
                      <div className="truncate max-w-xs" title={`${task.srcBucket}/${task.srcKey}`}>
                        <span className="text-muted-foreground text-xs">{task.srcBucket}/</span>
                        {srcFile}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </td>
                    <td className="px-6 py-3">
                      <div className="truncate max-w-xs" title={`${task.dstBucket}/${task.dstKey}`}>
                        <span className="text-muted-foreground text-xs">{task.dstBucket}/</span>
                        {dstFile}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <Badge variant={config.variant} className="gap-1">
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      {task.status === "RUNNING" ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8">{task.progress}%</span>
                        </div>
                      ) : task.status === "FAILED" ? (
                        <button
                          className="text-xs text-destructive hover:underline truncate max-w-[120px] block"
                          title={task.error || ""}
                          onClick={() => setExpandedError(expandedError === task.id ? null : task.id)}
                        >
                          {task.error || "未知错误"}
                        </button>
                      ) : task.status === "SUCCEEDED" ? (
                        <span className="text-xs text-muted-foreground">100%</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right text-xs text-muted-foreground">
                      {new Date(task.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => handleDelete(task.id, task.status)}
                        title={task.status === "QUEUED" || task.status === "RUNNING" ? "取消" : "删除"}
                      >
                        {task.status === "QUEUED" || task.status === "RUNNING" ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {/* 展开的错误详情 */}
        {expandedError && (
          <div className="mx-6 mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm">
            <div className="font-medium text-destructive mb-1">错误详情</div>
            <div className="text-muted-foreground whitespace-pre-wrap">
              {tasks.find((t) => t.id === expandedError)?.error || "无"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
