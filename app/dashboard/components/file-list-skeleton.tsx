"use client";

export function FileListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <table className="w-full text-sm">
      <thead className="border-b sticky top-0 bg-background">
        <tr>
          <th className="w-10 px-4 py-3 text-left">
            <div className="w-4 h-4 rounded bg-muted animate-pulse" />
          </th>
          <th className="px-4 py-3 text-left font-medium text-muted-foreground">名称</th>
          <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">大小</th>
          <th className="px-4 py-3 text-right font-medium text-muted-foreground w-44">修改时间</th>
          <th className="w-16 px-4 py-3"></th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i} className="border-b">
            <td className="px-4 py-3">
              <div className="w-4 h-4 rounded bg-muted animate-pulse" />
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-muted animate-pulse flex-shrink-0" />
                <div
                  className="h-4 rounded bg-muted animate-pulse"
                  style={{ width: `${40 + ((i * 37) % 40)}%` }}
                />
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="h-4 w-14 rounded bg-muted animate-pulse ml-auto" />
            </td>
            <td className="px-4 py-3">
              <div className="h-4 w-32 rounded bg-muted animate-pulse ml-auto" />
            </td>
            <td className="px-4 py-3">
              <div className="w-7 h-7 rounded bg-muted animate-pulse mx-auto" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
