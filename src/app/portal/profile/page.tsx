
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/client";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  EXEC: "Exec",
  MEMBER: "Member",
};

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { name, email, role } = session.user;
  const roleLabel = ROLE_LABEL[(role as Role) ?? "MEMBER"] ?? "Member";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* 頂部 Banner */}
      <section className="px-4 py-12" style={{ backgroundColor: PRIMARY }}>
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="text-sm mb-4 inline-block hover:underline"
            style={{ color: SECONDARY }}
          >
            ← 回到 Portal
          </Link>

          <p
            className="text-xs font-medium uppercase tracking-widest mb-1"
            style={{ color: `${SECONDARY}99` }}
          >
            Portal
          </p>

          <h1
            className="text-2xl font-bold"
            style={{ color: SECONDARY }}
          >
            個人資料
          </h1>
        </div>
      </section>

      {/* 資料卡片 */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div
          className="rounded-2xl bg-white p-8 shadow-sm flex flex-col gap-5"
          style={{ border: "1px solid #e5e7eb" }}
        >
          <div className="flex flex-col gap-1">
            <span
              className="text-xs font-medium uppercase tracking-widest"
              style={{ color: "#9ca3af" }}
            >
              姓名
            </span>

            <span
              className="text-base font-semibold"
              style={{ color: PRIMARY }}
            >
              {name ?? "—"}
            </span>
          </div>

          <div
            className="w-full h-px"
            style={{ backgroundColor: "#f3f4f6" }}
          />

          <div className="flex flex-col gap-1">
            <span
              className="text-xs font-medium uppercase tracking-widest"
              style={{ color: "#9ca3af" }}
            >
              Email
            </span>

            <span className="text-base" style={{ color: PRIMARY }}>
              {email ?? "—"}
            </span>
          </div>

          <div
            className="w-full h-px"
            style={{ backgroundColor: "#f3f4f6" }}
          />

          <div className="flex flex-col gap-1">
            <span
              className="text-xs font-medium uppercase tracking-widest"
              style={{ color: "#9ca3af" }}
            >
              角色
            </span>

            <span
              className="inline-flex w-fit text-xs font-semibold px-3 py-1 rounded-full"
              style={{
                backgroundColor: `${PRIMARY}15`,
                color: PRIMARY,
              }}
            >
              {roleLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
