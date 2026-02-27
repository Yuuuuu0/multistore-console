"use client";

import dynamic from "next/dynamic";
import { Sidebar } from "../components/sidebar";

const AuditLogList = dynamic(() => import("./audit-log-list").then((m) => m.AuditLogList), {
  ssr: false,
});

export default function AuditLogsPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <AuditLogList />
    </div>
  );
}
