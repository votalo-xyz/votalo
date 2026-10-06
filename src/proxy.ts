import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// The URL alone decides the language (`localeDetection: false` in routing.ts), so an embedded widget keeps the
// language the embedding site chose, and a browser set to Spanish still lands on English at "/".
export default createMiddleware(routing);

export const config = {
  // Everything except API routes, Next internals, the brand pack page (a static folder with no language) and
  // files with an extension (the `\\.` is a literal dot).
  matcher: "/((?!api|_next|_vercel|branding-votalo|.*\\..*).*)",
};
