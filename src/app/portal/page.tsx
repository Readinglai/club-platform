
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isProfileComplete } from "@/lib/membership/profile";
import { can, getAccess } from "@/lib/access/can";
import { db } from "@/lib/db";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default async function PortalPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Everyone fills in their details once before using the portal.
  if (!(await isProfileComplete(session.user.id))) {
    redirect("/portal/complete-profile");
  }

  // Team and Approvals only appear for people who can use them.
  const access = await getAccess(session.user.id);
  const canManageTeam = can(access, "groups.manage");
  const leadsSomething =
    (await db.groupMember.count({
      where: { userId: session.user.id, position: { in: ["PRESIDENT", "VP"] } },
    })) > 0;
  const staffLinks = [
    canManageTeam && { href: "/portal/team", title: "團隊 Team", text: "管理群組成員與子群組" },
    leadsSomething && { href: "/portal/approvals", title: "審核 Approvals", text: "待審項目與你的申請" },
  ].filter((link): link is { href: string; title: string; text: string } => Boolean(link));

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* 頂部 Banner */}
      <section
        className="px-4 py-12"
        style={{ backgroundColor: PRIMARY }}
      >
        <div className="max-w-3xl mx-auto">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-1"
            style={{ color: `${SECONDARY}99` }}
          >
            ROCSAUT
          </p>

          <h1
            className="text-2xl font-bold"
            style={{ color: SECONDARY }}
          >
            Portal
          </h1>

          <p
            className="mt-2 text-sm"
            style={{ color: "#ffffffaa" }}
          >
            歡迎回來，{session.user.name ?? "會員"}
          </p>
        </div>
      </section>

      {/* Portal 功能 */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="grid gap-4">
          <Link
            href="/portal/membership"
            className="rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            style={{ border: "1px solid #e5e7eb" }}
          >
            <h2
              className="text-lg font-semibold"
              style={{ color: PRIMARY }}
            >
              會員資格 Membership
            </h2>

            <p
              className="mt-1 text-sm"
              style={{ color: "#6b7280" }}
            >
              查看會員狀態或加入會員
            </p>
          </Link>

          {staffLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              style={{ border: "1px solid #e5e7eb" }}
            >
              <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>
                {link.title}
              </h2>
              <p className="mt-1 text-sm" style={{ color: "#6b7280" }}>
                {link.text}
              </p>
            </Link>
          ))}

          <Link
            href="/portal/profile"
            className="rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            style={{ border: "1px solid #e5e7eb" }}
          >
            <h2
              className="text-lg font-semibold"
              style={{ color: PRIMARY }}
            >
              個人資料
            </h2>

            <p
              className="mt-1 text-sm"
              style={{ color: "#6b7280" }}
            >
              查看及編輯你的會員資料
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
