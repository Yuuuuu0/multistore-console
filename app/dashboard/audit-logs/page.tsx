"use client";

import dynamic from "next/dynamic";
import { Sidebar } from "../components/sidebar";

const AuditLogList = dynamic(
  () => import("./audit-log-list").then((m) => m.AuditLogList),
  {
    ssr: false,
  },
);

export default function AuditLogsPage() {
  return (
    <div className="flex flex-col lg:flex-row h-dvh overflow-hidden bg-background">
      <Sidebar />
      <AuditLogList />
    </div>
  );
}
