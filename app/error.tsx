"use client";

import { useEffect } from "react";

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
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-semibold">出错了</h2>
      <p className="text-muted-foreground text-sm">
        {error.message || "发生了未知错误"}
      </p>
      <Button onClick={reset} variant="outline">
        重试
      </Button>
    </div>
  );
}
