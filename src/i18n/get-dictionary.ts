import type { Dictionary } from "./dictionary";
import type { Locale } from "./locale";
import { en } from "./en";
import { uk } from "./uk";

// Client-safe: no next/headers import here, unlike ./index.ts.
export function getDictionary(locale: Locale): Dictionary {
  return locale === "en" ? en : uk;
}
