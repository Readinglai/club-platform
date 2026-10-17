/** Remember the chosen language for a year (read by src/i18n/request.ts). Browser only. */
export function saveLocale(locale: string) {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; samesite=lax`;
}
