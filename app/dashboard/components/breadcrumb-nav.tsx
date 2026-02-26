"use client";

import { Button } from "@/components/ui/button";

import type { BreadcrumbItem } from "../lib/file-utils";

type BreadcrumbNavProps = {
  selectedBucket: string | null;
  breadcrumbs: BreadcrumbItem[];
  onBreadcrumbClick: (index: number) => void;
};

export function BreadcrumbNav({ selectedBucket, breadcrumbs, onBreadcrumbClick }: BreadcrumbNavProps) {
  if (!selectedBucket) return null;

  return (
    <div className="border-b p-4 flex items-center gap-2 text-sm flex-shrink-0">
      <Button variant="ghost" size="sm" onClick={() => onBreadcrumbClick(-1)}>
        {selectedBucket}
      </Button>
      {breadcrumbs.map((part, index) => (
        <div key={`${part.prefix}-${index}`} className="flex items-center gap-2">
          <span className="text-muted-foreground">/</span>
          <Button variant="ghost" size="sm" onClick={() => onBreadcrumbClick(index)}>
            {part.label}
          </Button>
        </div>
      ))}
    </div>
  );
}
