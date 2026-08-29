import type { Dictionary } from "./dictionary";
import type { Locale } from "./locale";

export { getDictionary } from "./get-dictionary";
export type { Dictionary, Locale };
export { DEFAULT_LOCALE, LOCALE_COOKIE, intlTag, parseLocale } from "./locale";
export { getServerLocale } from "./server";
