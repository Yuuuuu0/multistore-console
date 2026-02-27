import { TransferList } from "./transfer-list";
import { Sidebar } from "../components/sidebar";

export default function TransfersPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <TransferList />
    </div>
  );
}
