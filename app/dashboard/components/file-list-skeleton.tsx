"use client";

/**
 * 对象列表骨架屏占位组件
 */
export function FileListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <table className="w-full text-xs sm:text-sm border-collapse">
      <thead className="border-b sticky top-0 bg-background/95">
        <tr className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          <th className="w-10 px-4 py-2.5 text-left">
            <div className="w-4 h-4 rounded bg-muted animate-pulse" />
          </th>
          <th className="px-4 py-2.5 text-left font-medium">对象名称 // KEY</th>
          <th className="px-4 py-2.5 text-right font-medium w-28">大小</th>
          <th className="hidden md:table-cell px-4 py-2.5 text-right font-medium w-48">
            修改时间
          </th>
          <th className="w-28 px-4 py-2.5"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/50">
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i}>
            <td className="px-4 py-3">
              <div className="w-4 h-4 rounded bg-muted animate-pulse" />
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded bg-muted animate-pulse shrink-0" />
                <div
                  className="h-3.5 rounded bg-muted animate-pulse"
                  style={{ width: `${35 + ((i * 29) % 45)}%` }}
                />
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="h-3.5 w-14 rounded bg-muted animate-pulse ml-auto" />
            </td>
            <td className="hidden md:table-cell px-4 py-3">
              <div className="h-3.5 w-32 rounded bg-muted animate-pulse ml-auto" />
            </td>
            <td className="px-4 py-3">
              <div className="w-6 h-6 rounded bg-muted animate-pulse ml-auto" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
