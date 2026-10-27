import { getLocale, getMessages } from "next-intl/server";
import Providers from "@/components/Providers";
import { getCurrentUser } from "@/lib/access/current-user";
import { getPortalSections, type PortalSections } from "@/lib/access/portal-nav";
import PortalShell from "./PortalShell";

const NONE: PortalSections = { events: false, team: false, finance: false, members: false, announcements: false, website: false, reports: false };

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const [locale, messages, user] = await Promise.all([getLocale(), getMessages(), getCurrentUser()]);
  const sections = user ? await getPortalSections(user.id) : NONE;

  return (
    <Providers locale={locale} messages={messages}>
      <PortalShell sections={sections}>{children}</PortalShell>
    </Providers>
  );
}
