"use client";

import { ChevronRight, Database, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { BreadcrumbItem } from "../lib/file-utils";

type BreadcrumbNavProps = {
  selectedBucket: string | null;
  breadcrumbs: BreadcrumbItem[];
  onBreadcrumbClick: (index: number) => void;
  providerName?: string;
  objectCount?: number;
  onOpenCorsConfig?: () => void;
};

/**
 * 存储桶路径面包屑与坐标导航栏
 */
export function BreadcrumbNav({
  selectedBucket,
  breadcrumbs,
  onBreadcrumbClick,
  providerName,
  objectCount,
  onOpenCorsConfig,
}: BreadcrumbNavProps) {
  if (!selectedBucket) return null;

  return (
    <div className="border-b bg-muted/25 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0 py-0.5">
        <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary text-muted-foreground shrink-0">
          {providerName ? `${providerName} //` : "S3://"}
        </span>

        <Button
          variant={breadcrumbs.length === 0 ? "secondary" : "ghost"}
          size="xs"
          className="h-6 px-2 font-mono text-xs gap-1.5 shrink-0"
          onClick={() => onBreadcrumbClick(-1)}
        >
          <Database className="w-3 h-3 text-primary" />
          <span>{selectedBucket}</span>
        </Button>

        {breadcrumbs.map((part, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <div
              key={`${part.prefix}-${index}`}
              className="flex items-center gap-1 shrink-0"
            >
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
              <Button
                variant={isLast ? "secondary" : "ghost"}
                size="xs"
                className="h-6 px-2 font-mono text-xs"
                onClick={() => onBreadcrumbClick(index)}
              >
                {part.label}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {typeof objectCount === "number" && (
          <Badge variant="outline" className="font-mono text-[10px] h-5 px-2">
            {objectCount} 个对象
          </Badge>
        )}
        {onOpenCorsConfig && (
          <button
            type="button"
            onClick={onOpenCorsConfig}
            className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors px-2 py-0.5 rounded border border-border/70 bg-background/60"
          >
            <ShieldCheck className="w-3 h-3 text-primary" />
            <span>CORS 直传检测</span>
          </button>
        )}
      </div>
    </div>
  );
}
