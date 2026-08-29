export type Locale = "uk" | "en";

export const LOCALE_COOKIE = "locale";
export const DEFAULT_LOCALE: Locale = "uk";

export function parseLocale(value: string | undefined): Locale {
  return value === "en" ? "en" : DEFAULT_LOCALE;
}

export function intlTag(locale: Locale): string {
  return locale === "uk" ? "uk-UA" : "en-US";
}
