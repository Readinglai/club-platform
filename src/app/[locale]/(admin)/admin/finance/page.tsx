import { requireAuth } from "@/lib/auth/guard";
import FinanceManager from "./FinanceManager";

export default async function FinancePage() {
  await requireAuth(3);
  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "#1a2744" }}>財務管理</h1>
        <p className="text-sm text-gray-500 mt-1">管理社團收支記錄、預算設定及財務報表。</p>
      </div>
      <FinanceManager />
    </div>
  );
}
