"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 bg-architectural-grid">
      <div className="max-w-md w-full rounded-xl border bg-card p-6 text-center space-y-4 shadow-xs">
        <div className="w-10 h-10 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold">出错了</h2>
          <p className="text-muted-foreground text-xs font-mono break-words">
            {error.message || "发生了未知错误"}
          </p>
        </div>
        <Button onClick={reset} variant="outline" size="sm">
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          重试
        </Button>
      </div>
    </div>
  );
}
