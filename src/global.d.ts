import type { routing } from "./i18n/routing";
import type es from "./messages/es.json";

// Type-checks every translation key against the Spanish messages.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof es;
  }
}
