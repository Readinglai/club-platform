import { getLocale, getMessages } from "next-intl/server";
import Providers from "@/components/Providers";

export default async function HiloLayout({ children }: { children: React.ReactNode }) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return (
    <Providers locale={locale} messages={messages}>
      <div lang={locale === "zh" ? "zh-Hant" : "en"} className="ticket-page">
        {children}
      </div>
    </Providers>
  );
}
