import { ArrowUpRight, Layers } from "lucide-react";

/**
 * 控制台底部规格与开源仓库元信息组件
 */
export function Footer() {
  return (
    <footer className="px-3 py-2.5 text-[11px] text-muted-foreground flex items-center justify-between gap-2 select-none">
      <div className="flex items-center gap-1.5 min-w-0">
        <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="font-mono tracking-tight truncate">MSC // v1.0</span>
      </div>
      <a
        href="https://github.com/Yuuuuu0/multistore-console"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-medium text-foreground/80 hover:text-primary transition-colors shrink-0"
      >
        <span>MultiStore Console</span>
        <ArrowUpRight className="w-3 h-3" />
      </a>
    </footer>
  );
}
