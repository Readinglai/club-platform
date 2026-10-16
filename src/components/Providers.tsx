"use client";

import { SessionProvider } from "next-auth/react";
import { NextIntlClientProvider } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import { DEFAULT_TIME_ZONE } from "@/i18n/time-zone";

interface ProvidersProps {
  children: React.ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
}

export default function Providers({ children, locale, messages }: ProvidersProps) {
  return (
    <SessionProvider>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone={DEFAULT_TIME_ZONE}>
        {children}
      </NextIntlClientProvider>
    </SessionProvider>
  );
}
