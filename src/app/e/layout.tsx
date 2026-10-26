import { Big_Shoulders } from "next/font/google";
import { getLocale, getMessages } from "next-intl/server";
import Providers from "@/components/Providers";

// The door scanner's box-office face, so the ticket you buy and the scanner
// that admits you read as one system (see src/app/staff/layout.tsx).
const display = Big_Shoulders({ subsets: ["latin"], variable: "--font-ticket-display" });

export default async function TicketLayout({ children }: { children: React.ReactNode }) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return (
    <Providers locale={locale} messages={messages}>
      <div lang={locale === "zh" ? "zh-Hant" : "en"} className={`${display.variable} ticket-page`}>
        {children}
      </div>
    </Providers>
  );
}
