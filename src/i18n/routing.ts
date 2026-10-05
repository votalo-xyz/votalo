import { defineRouting } from "next-intl/routing";

// Spanish lives at the root ("/"), English under "/en". A browser that asks for English is sent to /en.
export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
