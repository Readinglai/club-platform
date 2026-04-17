import { db } from "@/lib/db";
import SiteConfigForm from "./SiteConfigForm";

export default async function SiteConfigPage() {
  const heroRecord = await db.siteConfig.findUnique({ where: { key: "heroImageUrl" } }).catch(() => null);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "#1a2744" }}>網站設定</h1>
        <p className="text-sm text-gray-500 mt-1">管理首頁 Hero 背景圖等全域設定。</p>
      </div>
      <SiteConfigForm heroImageUrl={heroRecord?.value ?? ""} />
    </div>
  );
}
