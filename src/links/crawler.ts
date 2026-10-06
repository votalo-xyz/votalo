import { prefixedLocale } from "../i18n/routing";

/**
 * A small link crawler for a running Votalo server. It starts from the home pages and a few app routes,
 * fetches each page, follows every internal `<a href>`, and records any link that does not return 200.
 * It also checks that a page in one language links to pages in the same language.
 */
export type Anchor = { href: string; hreflang: string | null };
export type Broken = { url: string; status: number | string; from: string };
export type Crawl = { pages: Map<string, number>; broken: Broken[]; crossLanguage: { from: string; href: string }[] };

const ANCHOR = /<a\s([^>]*?)>/gi;
const ATTR = /([a-zA-Z-]+)\s*=\s*"([^"]*)"/g;

export function anchorsIn(html: string): Anchor[] {
  const out: Anchor[] = [];
  for (const tag of html.matchAll(ANCHOR)) {
    const attrs = new Map<string, string>();
    for (const attr of tag[1].matchAll(ATTR)) attrs.set(attr[1].toLowerCase(), attr[2].replaceAll("&amp;", "&"));
    const href = attrs.get("href");
    if (href) out.push({ href, hreflang: attrs.get("hreflang") ?? null });
  }
  return out;
}

const hasPrefix = (pathname: string) => pathname === `/${prefixedLocale}` || pathname.startsWith(`/${prefixedLocale}/`);

/** Static pages that exist once for both languages, so a link to them from an English page is not a language switch. */
export const isLanguageNeutral = (pathname: string) => pathname === "/branding-votalo" || pathname.startsWith("/branding-votalo/");

export async function crawl(base: string, seeds: string[], limit = 400): Promise<Crawl> {
  const origin = new URL(base).origin;
  const pages = new Map<string, number>();
  const broken: Broken[] = [];
  const crossLanguage: Crawl["crossLanguage"] = [];
  const queue: { path: string; from: string }[] = seeds.map((path) => ({ path, from: "(seed)" }));
  const seen = new Set<string>();

  while (queue.length && seen.size < limit) {
    const { path, from } = queue.shift()!;
    if (seen.has(path)) continue;
    seen.add(path);

    let status: number | string;
    let html = "";
    try {
      // Do not follow redirects: a link that redirects is a link that is not canonical.
      const res = await fetch(origin + path, { redirect: "manual" });
      status = res.status;
      if (res.status === 200 && (res.headers.get("content-type") ?? "").includes("text/html")) html = await res.text();
    } catch {
      status = "network error";
    }
    pages.set(path, typeof status === "number" ? status : 0);
    if (status !== 200) {
      broken.push({ url: path, status, from });
      continue;
    }

    // A page may set <base href>, which changes what its relative links point to (the brand pack page does).
    const base = new URL(html.match(/<base\s[^>]*href="([^"]*)"/i)?.[1] ?? "", origin + path).href;

    for (const { href, hreflang } of anchorsIn(html)) {
      if (/^(mailto:|tel:|javascript:|#)/.test(href)) continue;
      let url: URL;
      try {
        url = new URL(href, base);
      } catch {
        continue;
      }
      if (url.origin !== origin) continue; // external links are not our pages
      const target = url.pathname.replace(/\/$/, "") || "/";
      // The language switch is meant to cross languages; nothing else is, except pages that have no language.
      if (!hreflang && !isLanguageNeutral(target) && hasPrefix(path) !== hasPrefix(target)) crossLanguage.push({ from: path, href: target });
      if (!seen.has(target)) queue.push({ path: target, from: path });
    }
  }
  return { pages, broken, crossLanguage };
}
