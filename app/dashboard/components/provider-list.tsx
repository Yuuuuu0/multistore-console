"use client";

import type { MouseEvent } from "react";
import {
  ChevronDown,
  ChevronRight,
  Cloud,
  Database,
  Edit2,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { Bucket, Provider } from "../lib/file-utils";

type ProviderListProps = {
  providers: Provider[];
  selectedProvider: Provider | null;
  selectedBucket: string | null;
  buckets: Bucket[];
  onProviderSelect: (provider: Provider) => void;
  onBucketSelect: (bucket: string) => void;
  onAddProvider: () => void;
  onEditProvider: (provider: Provider) => void;
  onDeleteProvider: (id: string, name: string) => void;
  onOpenCorsConfig?: (bucket: string) => void;
};

const PROVIDER_TYPE_META: Record<string, { label: string; badgeClass: string }> = {
  s3: {
    label: "AWS S3",
    badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  },
  oss: {
    label: "ALIYUN OSS",
    badgeClass: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/25",
  },
  cos: {
    label: "TENCENT COS",
    badgeClass: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/25",
  },
  custom: {
    label: "S3 COMPAT",
    badgeClass: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25",
  },
};

/**
 * 存储商与存储桶拓扑列表组件
 */
export function ProviderList({
  providers,
  selectedProvider,
  selectedBucket,
  buckets,
  onProviderSelect,
  onBucketSelect,
  onAddProvider,
  onEditProvider,
  onDeleteProvider,
  onOpenCorsConfig,
}: ProviderListProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1 gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground whitespace-nowrap">
            NODES // 存储商
          </span>
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-mono shrink-0">
            {providers.length}
          </Badge>
        </div>
        <Button
          size="xs"
          variant="outline"
          className="h-6 px-2 text-[11px] gap-1 shrink-0"
          onClick={onAddProvider}
          title="添加存储商"
        >
          <Plus className="w-3 h-3" />
          <span>添加</span>
        </Button>
      </div>

      {providers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-sidebar-border p-4 text-center space-y-2.5 bg-background/40">
          <Cloud className="w-6 h-6 mx-auto text-muted-foreground/70" />
          <div className="space-y-0.5">
            <p className="text-xs font-medium">暂无存储商节点</p>
            <p className="text-[11px] text-muted-foreground">
              点击上方按钮接入 S3 / OSS / COS
            </p>
          </div>
          <Button size="xs" onClick={onAddProvider} className="w-full">
            <Plus className="w-3 h-3 mr-1" />
            添加存储商
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {providers.map((provider) => {
            const isSelected = selectedProvider?.id === provider.id;
            const meta =
              PROVIDER_TYPE_META[provider.type] || PROVIDER_TYPE_META.custom;
            const bucketCount = provider.buckets?.length ?? 0;

            return (
              <div
                key={provider.id}
                className={`rounded-lg border transition-colors ${
                  isSelected
                    ? "border-primary/40 bg-sidebar-accent/70 shadow-2xs"
                    : "border-transparent hover:border-sidebar-border hover:bg-sidebar-accent/40"
                }`}
              >
                <div className="group flex items-center justify-between p-1.5 gap-1">
                  <button
                    type="button"
                    onClick={() => onProviderSelect(provider)}
                    className="flex-1 flex items-center gap-2 min-w-0 text-left px-1.5 py-1 rounded"
                  >
                    {isSelected ? (
                      <ChevronDown className="w-3.5 h-3.5 text-primary shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">
                          {provider.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`inline-flex items-center px-1 py-0 text-[9px] font-mono rounded border ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {bucketCount} 桶
                        </span>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-0.5 opacity-80 lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      title={`编辑 ${provider.name}`}
                      onClick={(e: MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        onEditProvider(provider);
                      }}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      title={`删除 ${provider.name}`}
                      onClick={(e: MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        onDeleteProvider(provider.id, provider.name);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {isSelected && (
                  <div className="px-2 pb-2 pt-0.5 space-y-1 border-t border-sidebar-border/60">
                    {buckets.length === 0 ? (
                      <div className="px-2 py-2 text-[11px] text-muted-foreground">
                        未关联可用存储桶
                      </div>
                    ) : (
                      buckets.map((bucket, idx) => {
                        const isBucketActive = selectedBucket === bucket.Name;
                        return (
                          <div
                            key={`${provider.id}-${bucket.Name}-${idx}`}
                            className="flex items-center gap-1"
                          >
                            <button
                              type="button"
                              onClick={() => onBucketSelect(bucket.Name)}
                              className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-mono transition-all min-w-0 ${
                                isBucketActive
                                  ? "bg-primary text-primary-foreground font-medium shadow-2xs"
                                  : "text-sidebar-foreground/80 hover:bg-background/80 hover:text-foreground"
                              }`}
                            >
                              <Database className="w-3 h-3 shrink-0" />
                              <span className="truncate">{bucket.Name}</span>
                            </button>
                            {isBucketActive && onOpenCorsConfig && (
                              <Button
                                type="button"
                                size="icon-xs"
                                variant="outline"
                                className="h-7 w-7 shrink-0 bg-background/80"
                                title="直传设置 (CORS)"
                                onClick={() => onOpenCorsConfig(bucket.Name)}
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                              </Button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
