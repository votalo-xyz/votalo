import { defineRouting } from "next-intl/routing";

// English lives at the root ("/"), Spanish under "/es". The URL alone decides the language: a browser set to
// Spanish still lands on English at "/", and reaches Spanish through the language switch or a /es link.
export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

/** The one locale that carries a URL prefix under "as-needed" (every locale except the default). */
export const prefixedLocale: Locale = routing.locales.find((l) => l !== routing.defaultLocale)!;
