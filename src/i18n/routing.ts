import { defineRouting } from "next-intl/routing";

// English lives at the root ("/"), Spanish under "/es". A browser that asks for Spanish is sent to /es.
export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

/** The one locale that carries a URL prefix under "as-needed" (every locale except the default). */
export const prefixedLocale: Locale = routing.locales.find((l) => l !== routing.defaultLocale)!;
