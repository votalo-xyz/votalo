/**
 * Crawls a running server and fails on any internal link that does not return 200, in Spanish and
 * English. Runs only when CRAWL_BASE_URL is set; `npm run test:links` builds nothing: it starts the
 * production build (`npm run build` first) on a free port and points this test at it.
 *
 * Against a server that has a real indexer, the example ids below do not exist, so the widget would
 * (correctly) answer 404 for them. Set CRAWL_EMBED_ID to a real proposal id in that case.
 */
import { describe, expect, it } from "vitest";
import { prefixedLocale } from "../i18n/routing";
import { crawl } from "./crawler";

const BASE = process.env.CRAWL_BASE_URL;
const PREFIX = `/${prefixedLocale}`;
const d = BASE ? describe : describe.skip;

// The example group's ids. Its pages load their data in the browser, so the links inside them cannot be
// found in the server HTML; these seeds make sure the pages themselves are still reachable.
const GROUP = "0x" + "d1".repeat(32);
const PROPOSAL = "0x" + "a1".repeat(32);
const EMBED_ID = process.env.CRAWL_EMBED_ID ?? PROPOSAL;
const APP_ROUTES = [
  "/start",
  "/groups",
  "/create",
  "/me",
  "/stats",
  "/about",
  "/pitch",
  "/legal/privacy",
  "/legal/terms",
  `/g/${GROUP}`,
  `/g/${GROUP}/new`,
  `/g/${GROUP}/me`,
  `/g/${GROUP}/p/${PROPOSAL}`,
  `/embed/p/${EMBED_ID}`,
];
const seeds = ["/", PREFIX, ...APP_ROUTES, ...APP_ROUTES.map((r) => `${PREFIX}${r}`)];

const csp = async (path: string) => {
  const res = await fetch(BASE! + path, { redirect: "manual" });
  return { status: res.status, csp: res.headers.get("content-security-policy") ?? "", xfo: res.headers.get("x-frame-options") };
};

// A crawl makes dozens of requests, so against a remote site it can pass vitest's default 5 s.
d("link crawl", { timeout: 180_000 }, () => {
  it("follows every internal link and none of them is broken", { timeout: 180_000 }, async () => {
    const { pages, broken } = await crawl(BASE!, seeds);
    expect(pages.size, "crawled suspiciously few pages").toBeGreaterThanOrEqual(30);
    expect(broken, `broken links:\n${broken.map((b) => `  ${b.status}  ${b.url}  (linked from ${b.from})`).join("\n")}`).toEqual([]);
  });

  it("reaches the four marketing pages and the legal pages in both languages", async () => {
    // Seeded directly: /pitch has no link from the footer any more, so a crawl from the home page would not reach it.
    const routes = ["/how-it-works", "/privacy", "/proof", "/faq", "/about", "/stats", "/pitch", "/legal/privacy", "/legal/terms", "/create", "/groups", "/me"];
    const { pages } = await crawl(BASE!, ["/", PREFIX, ...routes, ...routes.map((r) => `${PREFIX}${r}`)]);
    for (const route of routes) {
      expect(pages.get(route), `default ${route}`).toBe(200);
      expect(pages.get(`${PREFIX}${route}`), `prefixed ${route}`).toBe(200);
    }
  });

  it("serves the widget in both languages", async () => {
    const { pages } = await crawl(BASE!, [`/embed/p/${EMBED_ID}`, `${PREFIX}/embed/p/${EMBED_ID}`]);
    expect(pages.get(`/embed/p/${EMBED_ID}`), "default widget").toBe(200);
    expect(pages.get(`${PREFIX}/embed/p/${EMBED_ID}`), "prefixed widget").toBe(200);
  });

  it("serves the app install files: manifest, icons, worker and offline pages in both languages", async () => {
    const manifest = await fetch(BASE! + "/manifest.webmanifest", { redirect: "manual" });
    expect(manifest.status, "manifest").toBe(200);
    const json = (await manifest.json()) as { start_url: string; scope: string; display: string; icons: { src: string; purpose: string }[] };
    expect(json.start_url).toBe("/");
    expect(json.scope).toBe("/");
    expect(json.display).toBe("standalone");
    expect(json.icons.some((i) => i.purpose === "maskable"), "maskable icon").toBe(true);
    for (const icon of json.icons) {
      const res = await fetch(BASE! + icon.src, { redirect: "manual" });
      expect(res.status, icon.src).toBe(200);
      expect(res.headers.get("content-type"), icon.src).toBe("image/png");
    }
    const worker = await fetch(BASE! + "/sw.js", { redirect: "manual" });
    expect(worker.status, "/sw.js").toBe(200);
    expect(worker.headers.get("cache-control")).toBe("no-cache");
    const source = await worker.text();
    // The worker must never precache or serve the API, the widget or the brand pack.
    const precached = [...source.matchAll(/url:"([^"]+)"/g)].map((m) => m[1]);
    expect(precached.filter((u) => u.startsWith("/api/")), "api in precache").toEqual([]);
    expect(precached.filter((u) => /embed|branding-votalo/.test(u)), "widget or brand pack in precache").toEqual([]);
    expect(precached, "offline pages precached").toEqual(expect.arrayContaining(["/offline", `${PREFIX}/offline`]));
    for (const path of ["/offline", `${PREFIX}/offline`]) {
      const res = await fetch(BASE! + path, { redirect: "manual" });
      expect(res.status, path).toBe(200);
    }
  });

  it("serves the brand pack page with its files, linked from both footers, without a language redirect", async () => {
    const { pages, broken } = await crawl(BASE!, ["/", PREFIX]);
    expect(pages.get("/branding-votalo"), "brand page").toBe(200);
    expect(broken.filter((b) => b.url.startsWith("/branding-votalo")), "brand pack links").toEqual([]);
    // The pack's own downloads were reached through the page's <base href>.
    for (const file of ["/branding-votalo/votalo-branding-pack.zip", "/branding-votalo/png/logo-primary-light-1024.png", "/branding-votalo/svg/favicon.svg"]) {
      expect(pages.get(file), file).toBe(200);
    }
    const plain = await fetch(BASE! + "/branding-votalo", { redirect: "manual" });
    expect(plain.status, "/branding-votalo must not redirect to a language").toBe(200);
    expect(plain.headers.get("content-type") ?? "").toContain("text/html");
    // With a trailing slash Next answers with its usual redirect to the slash-less address, never to a language.
    const slash = await fetch(BASE! + "/branding-votalo/", { redirect: "manual" });
    if (slash.status !== 200) {
      expect(slash.status).toBe(308);
      expect(new URL(slash.headers.get("location") ?? "", BASE!).pathname).toBe("/branding-votalo");
    }
    const zip = await fetch(BASE! + "/branding-votalo/votalo-branding-pack.zip", { redirect: "manual" });
    expect(zip.headers.get("content-type")).toBe("application/zip");
  });

  it("keeps each language on its own pages", async () => {
    const { crossLanguage } = await crawl(BASE!, seeds);
    expect(crossLanguage, `links that switch language:\n${crossLanguage.map((c) => `  ${c.href}  (on ${c.from})`).join("\n")}`).toEqual([]);
  });

  it("answers an unknown address with a branded, server-rendered 404", async () => {
    for (const path of ["/no-such-page", `${PREFIX}/no-such-page`, "/no/such/deep/page"]) {
      const res = await fetch(BASE! + path, { redirect: "manual" });
      expect(res.status, path).toBe(404);
      const html = await res.text();
      const body = html.slice(html.indexOf("<body"));
      // The page is in the HTML itself, so it works without JavaScript and for crawlers.
      expect(body, `${path} should render its heading on the server`).toMatch(/<h1[ >]/);
      expect(body, path).toContain("No encontramos esta página");
      expect(body, path).toContain("We couldn&#x27;t find this page");
      expect(body, `${path} should link to both home pages`).toContain(`href="${PREFIX}"`);
      expect(body, path).toContain('href="/"');
    }
  });

  it("answers a malformed id inside the app with a real 404 status", async () => {
    // These are matched routes, so Next draws the branded page in the browser; the status is what matters here.
    for (const path of ["/g/not-an-id", `${PREFIX}/g/not-an-id`, "/legal/not-a-document", `/g/${GROUP}/p/not-an-id`]) {
      const res = await fetch(BASE! + path, { redirect: "manual" });
      expect(res.status, path).toBe(404);
    }
  });
});

d("embeddable widget", { timeout: 180_000 }, () => {
  it("can be framed by any site, and nothing else can", async () => {
    // The widget, including its own 404 (so a bad id still shows its message inside the frame).
    for (const path of [`/embed/p/${EMBED_ID}`, `${PREFIX}/embed/p/${EMBED_ID}`, `/embed/p/${EMBED_ID}?theme=light`, "/embed/p/not-an-id", `${PREFIX}/embed/p/not-an-id`]) {
      const r = await csp(path);
      expect(r.csp, `${path} should allow framing`).toContain("frame-ancestors *");
      expect(r.xfo, `${path} must not send X-Frame-Options`).toBeNull();
    }
    // Everything else: pages, the app, API routes and even a 404 stay frameable only by Votalo itself.
    for (const path of ["/", PREFIX, "/groups", "/create", "/about", "/how-it-works", "/legal/terms", `/g/${GROUP}`, `/g/${GROUP}/p/${PROPOSAL}`, "/no-such-page", "/api/stats", "/api/data-mode"]) {
      const r = await csp(path);
      expect(r.csp, `${path} should not be frameable by other sites`).toContain("frame-ancestors 'self'");
      expect(r.csp, path).not.toContain("frame-ancestors *");
    }
  });

  it("is a bare widget: no navbar or footer, and the theme follows ?theme=", async () => {
    const page = async (path: string) => (await (await fetch(BASE! + path)).text());
    const dark = await page(`/embed/p/${EMBED_ID}`);
    const light = await page(`/embed/p/${EMBED_ID}?theme=light`);
    for (const html of [dark, light]) {
      const body = html.slice(html.indexOf("<body"));
      expect(body, "no navbar").not.toContain("<header");
      expect(body, "no footer").not.toContain("<footer");
      expect(html).toContain("noindex");
    }
    expect(light, "light theme scopes the light tokens").toContain("force-light");
    expect(dark, "default is dark").not.toContain("force-light");
  });

  it("answers a malformed id with a 404", async () => {
    for (const path of ["/embed/p/not-an-id", `${PREFIX}/embed/p/not-an-id`, "/embed/p/0x1234"]) {
      expect((await fetch(BASE! + path, { redirect: "manual" })).status, path).toBe(404);
    }
  });
});
