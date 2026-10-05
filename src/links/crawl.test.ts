/**
 * Crawls a running server and fails on any internal link that does not return 200, in Spanish and
 * English. Runs only when CRAWL_BASE_URL is set; `npm run test:links` builds nothing: it starts the
 * production build (`npm run build` first) on a free port and points this test at it.
 */
import { describe, expect, it } from "vitest";
import { crawl } from "./crawler";

const BASE = process.env.CRAWL_BASE_URL;
const d = BASE ? describe : describe.skip;

// The example group's ids. Its pages load their data in the browser, so the links inside them cannot be
// found in the server HTML; these seeds make sure the pages themselves are still reachable.
const GROUP = "0x" + "d1".repeat(32);
const PROPOSAL = "0x" + "a1".repeat(32);
const APP_ROUTES = [
  "/start",
  "/groups",
  "/create",
  "/me",
  "/stats",
  "/about",
  "/legal/privacy",
  "/legal/terms",
  `/g/${GROUP}`,
  `/g/${GROUP}/new`,
  `/g/${GROUP}/me`,
  `/g/${GROUP}/p/${PROPOSAL}`,
];
const seeds = ["/", "/en", ...APP_ROUTES, ...APP_ROUTES.map((r) => `/en${r}`)];

d("link crawl", () => {
  it("follows every internal link and none of them is broken", { timeout: 180_000 }, async () => {
    const { pages, broken } = await crawl(BASE!, seeds);
    expect(pages.size, "crawled suspiciously few pages").toBeGreaterThanOrEqual(30);
    expect(broken, `broken links:\n${broken.map((b) => `  ${b.status}  ${b.url}  (linked from ${b.from})`).join("\n")}`).toEqual([]);
  });

  it("reaches the four marketing pages and the legal pages in both languages", async () => {
    const { pages } = await crawl(BASE!, ["/", "/en"]);
    for (const route of ["/how-it-works", "/privacy", "/proof", "/faq", "/about", "/stats", "/legal/privacy", "/legal/terms", "/create", "/groups", "/me"]) {
      expect(pages.get(route), `ES ${route}`).toBe(200);
      expect(pages.get(`/en${route}`), `EN ${route}`).toBe(200);
    }
  });

  it("keeps each language on its own pages", async () => {
    const { crossLanguage } = await crawl(BASE!, seeds);
    expect(crossLanguage, `links that switch language:\n${crossLanguage.map((c) => `  ${c.href}  (on ${c.from})`).join("\n")}`).toEqual([]);
  });

  it("answers an unknown address with a branded, server-rendered 404", async () => {
    for (const path of ["/no-such-page", "/en/no-such-page", "/no/such/deep/page"]) {
      const res = await fetch(BASE! + path, { redirect: "manual" });
      expect(res.status, path).toBe(404);
      const html = await res.text();
      const body = html.slice(html.indexOf("<body"));
      // The page is in the HTML itself, so it works without JavaScript and for crawlers.
      expect(body, `${path} should render its heading on the server`).toMatch(/<h1[ >]/);
      expect(body, path).toContain("No encontramos esta página");
      expect(body, path).toContain("We couldn&#x27;t find this page");
      expect(body, `${path} should link to both home pages`).toContain('href="/en"');
      expect(body, path).toContain('href="/"');
    }
  });

  it("answers a malformed id inside the app with a real 404 status", async () => {
    // These are matched routes, so Next draws the branded page in the browser; the status is what matters here.
    for (const path of ["/g/not-an-id", "/en/g/not-an-id", "/legal/not-a-document", `/g/${GROUP}/p/not-an-id`]) {
      const res = await fetch(BASE! + path, { redirect: "manual" });
      expect(res.status, path).toBe(404);
    }
  });
});
