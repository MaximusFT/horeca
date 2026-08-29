import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, parseLocale, type Locale } from './locale';

// Server-only: reads the locale cookie for the current request (App Router server components/routes).
export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  return parseLocale(store.get(LOCALE_COOKIE)?.value);
}

export { DEFAULT_LOCALE, LOCALE_COOKIE };
export type { Locale };
