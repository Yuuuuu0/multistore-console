"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  ArrowRightLeft,
  Boxes,
  HardDrive,
  Info,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  Settings,
  Sun,
} from "lucide-react";

import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type SidebarProps = {
  children?: ReactNode;
};

const NAV_ITEMS = [
  {
    href: "/dashboard",
    code: "01",
    label: "文件浏览",
    sublabel: "OBJECT MATRIX",
    icon: HardDrive,
  },
  {
    href: "/dashboard/transfers",
    code: "02",
    label: "传输任务",
    sublabel: "CLOUD RELAY",
    icon: ArrowRightLeft,
  },
  {
    href: "/dashboard/audit-logs",
    code: "03",
    label: "审计日志",
    sublabel: "AUDIT LEDGER",
    icon: ScrollText,
  },
  {
    href: "/settings",
    code: "04",
    label: "设置",
    sublabel: "SECURITY & KEYS",
    icon: Settings,
  },
  {
    href: "/about",
    code: "05",
    label: "关于",
    sublabel: "SPECIFICATIONS",
    icon: Info,
  },
];

/**
 * 全局导航与存储拓扑侧栏（桌面端固定左侧工业导轨，移动端顶部命令栏 + 抽屉）
 */
export function Sidebar({ children }: SidebarProps) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeNav =
    NAV_ITEMS.find((item) => item.href === pathname) || NAV_ITEMS[0];

  function toggleTheme() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  const navContent = (
    <>
      <div className="px-3 py-3 border-b border-sidebar-border/80">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            NAVIGATION // 控制矩阵
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ONLINE
          </span>
        </div>
        <nav className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground font-medium shadow-xs"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`font-mono text-[10px] tracking-tighter ${
                      isActive
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {item.code}
                  </span>
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                <span
                  className={`text-[9px] font-mono tracking-wider uppercase hidden xl:inline ${
                    isActive
                      ? "text-primary-foreground/75"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {item.sublabel}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {children ? (
        <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
          {children}
        </div>
      ) : (
        <div className="flex-1 px-4 py-6 flex flex-col justify-end min-h-0">
          <div className="rounded-lg border border-dashed border-sidebar-border p-3 bg-background/40 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>PROTOCOL</span>
              <span className="text-foreground font-medium">S3 / OSS / COS</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>ENGINE</span>
              <span className="text-foreground font-medium">PRESIGNED IO</span>
            </div>
          </div>
        </div>
      )}

      <div className="shrink-0 border-t border-sidebar-border/80 p-2.5 space-y-1.5 bg-sidebar/50">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="h-8 px-2.5 text-xs flex-1 justify-start gap-2 bg-background/60"
            title="切换明暗主题"
          >
            <Sun className="w-3.5 h-3.5 hidden dark:inline text-amber-400" />
            <Moon className="w-3.5 h-3.5 inline dark:hidden text-slate-700" />
            <span className="truncate">切换外观主题</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            退出登录
          </Button>
        </div>
        <Footer />
      </div>
    </>
  );

  return (
    <>
      {/* 移动端顶部导航栏 */}
      <div className="flex lg:hidden h-14 border-b border-border bg-sidebar/95 backdrop-blur-md px-3 items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-sm" aria-label="打开控制台菜单">
                <Menu className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[288px] p-0 bg-sidebar text-sidebar-foreground flex flex-col gap-0"
            >
              <SheetHeader className="h-14 px-4 border-b border-sidebar-border flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <SheetTitle className="text-sm font-semibold tracking-tight">
                    MultiStore Console
                  </SheetTitle>
                </div>
              </SheetHeader>
              {navContent}
            </SheetContent>
          </Sheet>

          <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Boxes className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-sm tracking-tight truncate">
              MultiStore Console
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
            {activeNav.label}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={toggleTheme}
            aria-label="切换主题"
          >
            <Sun className="w-4 h-4 hidden dark:inline text-amber-400" />
            <Moon className="w-4 h-4 inline dark:hidden" />
          </Button>
        </div>
      </div>

      {/* 桌面端固定左侧工业控制栏 */}
      <aside className="hidden lg:flex w-[272px] border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex-col overflow-hidden shrink-0 select-none">
        <div className="h-14 px-4 border-b border-sidebar-border flex items-center justify-between shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-sm tracking-tight leading-none">
                MultiStore Console
              </h2>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5 tracking-widest">
                STORAGE COCKPIT
              </p>
            </div>
          </Link>
        </div>
        {navContent}
      </aside>
    </>
  );
}
