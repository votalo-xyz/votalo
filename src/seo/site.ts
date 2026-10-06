/**
 * The public address of the site, with no trailing slash. It comes from NEXT_PUBLIC_SITE_URL (set to the
 * final domain on Vercel). Without it, a Vercel build uses the project's production domain, and a local
 * build uses localhost, so canonical and share links never point at a preview host.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/+$/, "");
