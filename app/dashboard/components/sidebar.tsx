"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ArrowRightLeft, Home, Info, LogOut, ScrollText, Settings } from "lucide-react";

import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";

type SidebarProps = {
  children?: ReactNode;
};

export function Sidebar({ children }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="w-64 border-r bg-muted/10 flex flex-col overflow-hidden">
      <div className="h-[57px] px-4 border-b flex items-center flex-shrink-0">
        <h2 className="font-semibold text-lg">MultiStore Console</h2>
      </div>
      <nav className="p-2 space-y-1 flex-shrink-0 border-b">
        <Link href="/dashboard">
          <Button variant={pathname === "/dashboard" ? "secondary" : "ghost"} className="w-full justify-start">
            <Home className="w-4 h-4 mr-2" />文件浏览
          </Button>
        </Link>
        <Link href="/dashboard/transfers">
          <Button variant={pathname === "/dashboard/transfers" ? "secondary" : "ghost"} className="w-full justify-start">
            <ArrowRightLeft className="w-4 h-4 mr-2" />传输任务
          </Button>
        </Link>
        <Link href="/dashboard/audit-logs">
          <Button variant={pathname === "/dashboard/audit-logs" ? "secondary" : "ghost"} className="w-full justify-start">
            <ScrollText className="w-4 h-4 mr-2" />审计日志
          </Button>
        </Link>
        <Link href="/settings">
          <Button variant={pathname === "/settings" ? "secondary" : "ghost"} className="w-full justify-start">
            <Settings className="w-4 h-4 mr-2" />设置
          </Button>
        </Link>
        <Link href="/about">
          <Button variant={pathname === "/about" ? "secondary" : "ghost"} className="w-full justify-start">
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
      {children && (
        <div className="flex-1 overflow-auto p-2 min-h-0">
          {children}
        </div>
      )}
      <div className="flex-shrink-0 border-t">
        <Footer />
      </div>
    </div>
  );
}
