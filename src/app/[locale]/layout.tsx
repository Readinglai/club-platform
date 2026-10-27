import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import HtmlLang from "@/components/HtmlLang";

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "zh" | "en")) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  // <html> and <body> come from the root layout (src/app/layout.tsx).
  return (
    <Providers locale={locale} messages={messages}>
      <HtmlLang locale={locale} />
      <Navbar />
      <main className="flex-1">{children}</main>
    </Providers>
  );
}
