import { TransferList } from "./transfer-list";
import { Sidebar } from "../components/sidebar";

export default function TransfersPage() {
  return (
    <div className="flex flex-col lg:flex-row h-dvh overflow-hidden bg-background">
      <Sidebar />
      <TransferList />
    </div>
  );
}
