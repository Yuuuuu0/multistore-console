"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  RefreshCw,
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

type StatusFilter =
  | "ALL"
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

const STATUS_CONFIG: Record<
  TransferTask["status"],
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: typeof CheckCircle2;
  }
> = {
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

/**
 * 跨云异步流转任务监控列表组件
 */
export function TransferList() {
  const [tasks, setTasks] = useState<TransferTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTasks = useCallback(
    async (showLoading = false) => {
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
    },
    [filter],
  );

  useEffect(() => {
    fetchTasks(true);
  }, [fetchTasks]);

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
    <div className="flex-1 flex flex-col overflow-hidden bg-architectural-grid">
      <div className="h-14 border-b bg-card/70 backdrop-blur px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <ArrowRightLeft className="w-4 h-4 text-primary" />
          <h1 className="text-base sm:text-lg font-semibold tracking-tight">
            传输任务
          </h1>
          <Badge variant="outline" className="font-mono text-[10px] hidden sm:inline-flex">
            AUTO-POLL // 5S
          </Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fetchTasks(false)}
          className="h-8 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          刷新
        </Button>
      </div>

      {/* 状态筛选 */}
      <div className="border-b bg-muted/20 px-4 sm:px-6 py-2.5 flex items-center gap-1.5 overflow-x-auto shrink-0">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={filter === f.value ? "default" : "outline"}
            onClick={() => setFilter(f.value)}
            className="h-7 text-xs shrink-0"
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* 任务列表 */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            <Loader2 className="w-5 h-5 animate-spin mr-2 text-primary" />
            加载中...
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center space-y-2 text-muted-foreground">
            <ArrowRightLeft className="w-8 h-8 mx-auto opacity-50" />
            <p className="text-sm font-medium text-foreground">暂无传输任务</p>
            <p className="text-xs">
              在「文件浏览」中右键点击文件选择「跨云传输」即可创建后台流转任务
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
                <tr className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 sm:px-6 py-3 text-left font-medium">
                    源文件 // SOURCE
                  </th>
                  <th className="px-2 py-3 w-8"></th>
                  <th className="px-4 sm:px-6 py-3 text-left font-medium">
                    目标 // DESTINATION
                  </th>
                  <th className="px-4 py-3 text-center font-medium w-28">
                    状态
                  </th>
                  <th className="px-4 py-3 text-center font-medium w-32">
                    进度
                  </th>
                  <th className="hidden md:table-cell px-6 py-3 text-right font-medium w-44">
                    创建时间
                  </th>
                  <th className="px-4 sm:px-6 py-3 w-16 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-card/40">
                {tasks.map((task) => {
                  const config = STATUS_CONFIG[task.status];
                  const StatusIcon = config.icon;
                  const srcFile =
                    task.srcKey.split("/").pop() || task.srcKey;
                  const dstFile =
                    task.dstKey.split("/").pop() || task.dstKey;
                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-4 sm:px-6 py-3">
                        <div
                          className="truncate max-w-[180px] sm:max-w-xs font-mono"
                          title={`${task.srcBucket}/${task.srcKey}`}
                        >
                          <span className="text-muted-foreground text-xs">
                            {task.srcBucket}/
                          </span>
                          <span className="font-medium">{srcFile}</span>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <ArrowRight className="w-4 h-4 text-primary" />
                      </td>
                      <td className="px-4 sm:px-6 py-3">
                        <div
                          className="truncate max-w-[180px] sm:max-w-xs font-mono"
                          title={`${task.dstBucket}/${task.dstKey}`}
                        >
                          <span className="text-muted-foreground text-xs">
                            {task.dstBucket}/
                          </span>
                          <span className="font-medium">{dstFile}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={config.variant} className="gap-1">
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {task.status === "RUNNING" ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground w-9 text-right">
                              {task.progress}%
                            </span>
                          </div>
                        ) : task.status === "FAILED" ? (
                          <button
                            type="button"
                            className="text-xs text-destructive hover:underline truncate max-w-[140px] block mx-auto"
                            title={task.error || ""}
                            onClick={() =>
                              setExpandedError(
                                expandedError === task.id ? null : task.id,
                              )
                            }
                          >
                            {task.error || "未知错误"}
                          </button>
                        ) : task.status === "SUCCEEDED" ? (
                          <span className="text-xs font-mono text-emerald-500 block text-center">
                            100%
                          </span>
                        ) : (
                          <span className="text-xs font-mono text-muted-foreground block text-center">
                            --
                          </span>
                        )}
                      </td>
                      <td className="hidden md:table-cell px-6 py-3 text-right text-xs font-mono text-muted-foreground">
                        {new Date(task.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-right">
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleDelete(task.id, task.status)}
                          title={
                            task.status === "QUEUED" ||
                            task.status === "RUNNING"
                              ? "取消"
                              : "删除"
                          }
                        >
                          {task.status === "QUEUED" ||
                          task.status === "RUNNING" ? (
                            <XCircle className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {expandedError && (
          <div className="mx-4 sm:mx-6 my-4 p-4 bg-destructive/10 border border-destructive/25 rounded-lg text-xs space-y-1">
            <div className="font-semibold text-destructive">错误诊断详情</div>
            <div className="text-muted-foreground font-mono whitespace-pre-wrap">
              {tasks.find((t) => t.id === expandedError)?.error || "无"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
