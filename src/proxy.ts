import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const app = createMiddleware(routing);

// The widget's language is whatever its URL says: the site that embeds it chose it. Without this, a visitor's
// browser language would redirect an embedded Spanish widget to the English one.
const embed = createMiddleware({ ...routing, localeDetection: false });

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  return /^\/(en\/)?embed(\/|$)/.test(pathname) ? embed(request) : app(request);
}

export const config = {
  // Everything except API routes, Next internals and files with an extension (the `\\.` is a literal dot).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
