"use client";

import { useEffect } from "react";

/**
 * Keeps <html lang> in step with the page's language. The root layout sets
 * it on a full load, but it doesn't re-render when the language switch moves
 * between /en and /zh in the browser.
 */
export default function HtmlLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
