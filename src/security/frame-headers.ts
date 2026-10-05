/**
 * Who may put Votalo in a frame. The embeddable widget (/embed/*) is meant for other people's websites, so
 * it allows any parent. Everything else, including the app that handles passkeys, may only be framed by
 * Votalo itself. This uses CSP `frame-ancestors` and no X-Frame-Options on purpose: that header cannot say
 * "any site", and browsers that understand both follow the CSP.
 */
export const FRAME_SELF = "frame-ancestors 'self'";
export const FRAME_ANY = "frame-ancestors *";

/** The widget path in every form a request can arrive in (Spanish at the root, English, and the internal prefix). */
export const EMBED_SOURCES = ["/embed/:path*", "/en/embed/:path*", "/es/embed/:path*"] as const;

type Rule = { source: string; headers: { key: string; value: string }[] };

/**
 * Rules for next.config `headers()`. When two rules match a path and set the same header, Next keeps the
 * last one, so the embed rules come after the catch-all and override it for the widget only.
 */
export function frameHeaders(): Rule[] {
  const csp = (value: string) => [{ key: "Content-Security-Policy", value }];
  return [
    { source: "/:path*", headers: csp(FRAME_SELF) },
    ...EMBED_SOURCES.map((source) => ({ source, headers: csp(FRAME_ANY) })),
  ];
}
