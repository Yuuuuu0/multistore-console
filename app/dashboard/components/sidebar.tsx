"use client";

import type { MouseEvent } from "react";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronRight, Edit2, Folder, Home, Info, LogOut, Plus, Settings, X } from "lucide-react";

import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";

import type { Bucket, Provider } from "../lib/file-utils";

type SidebarProps = {
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

export function Sidebar({
  providers,
  selectedProvider,
  selectedBucket,
  buckets,
  onProviderSelect,
  onBucketSelect,
  onAddProvider,
  onEditProvider,
  onDeleteProvider,
}: SidebarProps) {
  return (
    <div className="w-64 border-r bg-muted/10 flex flex-col overflow-hidden">
      <div className="h-[57px] px-4 border-b flex items-center flex-shrink-0">
        <h2 className="font-semibold text-lg">MultiStore Console</h2>
      </div>
      <nav className="p-2 space-y-1 flex-shrink-0 border-b">
        <Link href="/dashboard">
          <Button variant="ghost" className="w-full justify-start">
            <Home className="w-4 h-4 mr-2" />文件浏览
          </Button>
        </Link>
        <Link href="/settings">
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="w-4 h-4 mr-2" />设置
          </Button>
        </Link>
        <Link href="/about">
          <Button variant="ghost" className="w-full justify-start">
            <Info className="w-4 h-4 mr-2" />关于
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="w-4 h-4 mr-2" />退出登录
        </Button>
      </nav>
      <div className="flex-1 overflow-auto p-2 min-h-0">
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
      </div>
      <div className="flex-shrink-0 border-t">
        <Footer />
      </div>
    </div>
  );
}
