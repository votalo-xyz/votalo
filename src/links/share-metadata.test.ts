/**
 * What link previews and search engines see. For every page, in both languages: the share address (og:url)
 * is the page's own address and matches the canonical link, the default locale (routing.ts) lives at the
 * root and the other locale under its own prefix, the language alternates point at each other (with
 * x-default on the default locale), and the share image exists and is served directly as a 200 PNG. Runs
 * with the crawler: `npm run build && npm run test:links`, or against any server with CRAWL_BASE_URL set.
 */
import { describe, expect, it } from "vitest";
import { prefixedLocale, routing } from "../i18n/routing";

const BASE = process.env.CRAWL_BASE_URL;
const d = BASE ? describe : describe.skip;

const GROUP = "0x" + "d1".repeat(32);
const PROPOSAL = "0x" + "a1".repeat(32);
const PATHS = [
  "/",
  "/how-it-works",
  "/privacy",
  "/proof",
  "/faq",
  "/about",
  "/stats",
  "/start",
  "/groups",
  "/create",
  "/me",
  "/legal/privacy",
  "/legal/terms",
  `/g/${GROUP}`,
  `/g/${GROUP}/new`,
  `/g/${GROUP}/me`,
  `/g/${GROUP}/p/${PROPOSAL}`,
];

function meta(html: string, attr: "property" | "name", name: string): string | undefined {
  return html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))?.[1];
}

function link(html: string, rel: string, hreflang?: string): string | undefined {
  const re = hreflang
    ? new RegExp(`<link rel="${rel}" hrefLang="${hreflang}" href="([^"]*)"`)
    : new RegExp(`<link rel="${rel}" href="([^"]*)"`);
  return html.match(re)?.[1];
}

/** "/" and "" are the same address. */
const norm = (pathname: string) => (pathname.replace(/\/+$/, "") || "/");
const pathOf = (url: string | undefined) => norm(new URL(url ?? "http://missing.invalid/__missing__").pathname);

/** The address of `path` in locale `loc`: prefixed for `prefixedLocale`, bare for the default locale. */
const pathFor = (loc: string, p: string) => (loc === prefixedLocale ? (p === "/" ? `/${prefixedLocale}` : `/${prefixedLocale}${p}`) : p);

d("share metadata", { timeout: 180_000 }, () => {
  for (const locale of ["es", "en"] as const) {
    it(`gives every page in ${locale.toUpperCase()} its own address, alternates and image`, async () => {
      const problems: string[] = [];
      const images = new Set<string>();

      for (const path of PATHS) {
        const wanted = norm(pathFor(locale, path));
        const url = `${BASE}${pathFor(locale, path)}`;
        const res = await fetch(url);
        const html = await res.text();
        const where = `${locale} ${path.replace(GROUP, "<group>").replace(PROPOSAL, "<proposal>")}`;
        if (res.status !== 200) {
          problems.push(`${where}: status ${res.status}`);
          continue;
        }

        const ogUrl = meta(html, "property", "og:url");
        const canonical = link(html, "canonical");
        const ogImage = meta(html, "property", "og:image");
        const twitterImage = meta(html, "name", "twitter:image");

        if (!ogUrl) problems.push(`${where}: og:url missing`);
        else if (pathOf(ogUrl) !== wanted) problems.push(`${where}: og:url is ${pathOf(ogUrl)}, expected ${wanted}`);
        if (canonical !== ogUrl) problems.push(`${where}: canonical (${canonical}) differs from og:url (${ogUrl})`);

        const defaultAlt = link(html, "alternate", routing.defaultLocale);
        const prefixedAlt = link(html, "alternate", prefixedLocale);
        const fallback = link(html, "alternate", "x-default");
        if (pathOf(defaultAlt) !== norm(pathFor(routing.defaultLocale, path)))
          problems.push(`${where}: ${routing.defaultLocale} alternate is ${pathOf(defaultAlt)}`);
        if (pathOf(prefixedAlt) !== norm(pathFor(prefixedLocale, path))) problems.push(`${where}: ${prefixedLocale} alternate is ${pathOf(prefixedAlt)}`);
        if (fallback !== defaultAlt) problems.push(`${where}: x-default (${fallback}) is not the ${routing.defaultLocale} address (${defaultAlt})`);

        const origins = new Set([ogUrl, canonical, defaultAlt, prefixedAlt, fallback, ogImage].map((u) => (u ? new URL(u).origin : "none")));
        if (origins.size !== 1) problems.push(`${where}: tags use different origins: ${[...origins].join(", ")}`);

        if (meta(html, "name", "twitter:card") !== "summary_large_image") problems.push(`${where}: twitter:card is not summary_large_image`);
        if (!ogImage) problems.push(`${where}: og:image missing`);
        else {
          if (twitterImage !== ogImage) problems.push(`${where}: twitter:image differs from og:image`);
          if (!new URL(ogImage).pathname.startsWith("/og/")) problems.push(`${where}: og:image is not under /og/ (${ogImage})`);
          images.add(new URL(ogImage).pathname);
        }
        if (meta(html, "property", "og:locale") !== (locale === "es" ? "es_MX" : "en_US")) problems.push(`${where}: og:locale is wrong`);
      }

      // The image must come back directly, not through a redirect, or chat apps may not show it.
      for (const imagePath of images) {
        const res = await fetch(BASE + imagePath, { redirect: "manual" });
        if (res.status !== 200) problems.push(`image ${imagePath}: status ${res.status}`);
        else if (res.headers.get("content-type") !== "image/png") problems.push(`image ${imagePath}: content-type ${res.headers.get("content-type")}`);
        else {
          const bytes = new Uint8Array(await res.arrayBuffer());
          const png = [0x89, 0x50, 0x4e, 0x47].every((b, i) => bytes[i] === b);
          if (!png || bytes.length < 5000) problems.push(`image ${imagePath}: not a real PNG (${bytes.length} bytes)`);
        }
      }

      expect(images.size, "expected at least the site card and the proposal card").toBeGreaterThanOrEqual(2);
      expect(problems, problems.join("\n")).toEqual([]);
    });
  }

  it("serves a card for each language that is 1200x630", async () => {
    for (const locale of ["es", "en"]) {
      const bytes = new Uint8Array(await (await fetch(`${BASE}/og/${locale}.png`)).arrayBuffer());
      // PNG header: width and height are big-endian 32-bit numbers at bytes 16 and 20.
      const view = new DataView(bytes.buffer);
      expect([view.getUint32(16), view.getUint32(20)], `${locale} card size`).toEqual([1200, 630]);
    }
  });
});
