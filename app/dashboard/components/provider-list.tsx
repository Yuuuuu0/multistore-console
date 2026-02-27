"use client";

import type { MouseEvent } from "react";

import { ChevronRight, Edit2, Folder, Plus, X } from "lucide-react";

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
};

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
}: ProviderListProps) {
  return (
    <>
      <div className="flex items-center justify-between px-2 mb-2">
        <div className="text-xs font-semibold text-muted-foreground">存储商</div>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onAddProvider}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {providers.length === 0 ? (
        <div className="text-xs text-muted-foreground px-2">暂无存储商，点击上方 + 添加</div>
      ) : (
        <div className="space-y-1">
          {providers.map((provider) => (
            <div key={provider.id}>
              <div className="group relative">
                <Button
                  variant={selectedProvider?.id === provider.id ? "secondary" : "ghost"}
                  className="w-full justify-start text-sm pr-8"
                  onClick={() => onProviderSelect(provider)}
                >
                  <ChevronRight className="w-4 h-4 mr-1" />
                  {provider.name}
                </Button>
                <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e: MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      onEditProvider(provider);
                    }}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e: MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      onDeleteProvider(provider.id, provider.name);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {selectedProvider?.id === provider.id && buckets.length > 0 && (
                <div className="ml-4 mt-1 space-y-1">
                  {buckets.map((bucket, idx) => (
                    <Button
                      key={`${provider.id}-${bucket.Name}-${idx}`}
                      variant={selectedBucket === bucket.Name ? "secondary" : "ghost"}
                      className="w-full justify-start text-xs"
                      onClick={() => onBucketSelect(bucket.Name)}
                    >
                      <Folder className="w-3 h-3 mr-1" />
                      {bucket.Name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
