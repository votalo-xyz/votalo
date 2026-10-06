/**
 * Static link check, no server needed: every internal path written in the source (links, router calls,
 * share paths, nav tables) must match a real page under src/app/[locale]. It also covers links that only
 * appear after a client screen loads, which a crawler of the server HTML would never see.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "..");
const APP = path.join(SRC, "app", "[locale]");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

/** One regular expression per page, built from the folder structure. */
function pagePatterns(): { route: string; pattern: RegExp }[] {
  return walk(APP)
    .filter((file) => path.basename(file) === "page.tsx")
    .map((file) => path.relative(APP, path.dirname(file)).split(path.sep).filter(Boolean))
    // Route groups like (app) are not part of the URL.
    .map((segments) => segments.filter((s) => !(s.startsWith("(") && s.endsWith(")"))))
    // The catch-all only exists to render the 404 page; it is not a destination.
    .filter((segments) => !segments.some((s) => s.startsWith("[...")))
    .map((segments) => ({
      route: "/" + segments.join("/"),
      pattern: new RegExp("^/" + segments.map((s) => (s.startsWith("[") ? "[^/]+" : s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("/") + "$"),
    }));
}

const SCAN_SKIP = [path.join(SRC, "lib"), path.join(SRC, "app", "api"), path.join(SRC, "messages"), path.join(SRC, "links")];

const LITERALS = [
  // href="/x", href={"/x"}, href: "/x", path={`/x/${id}`}, embedPath={`/embed/p/${id}`}
  /(?:href|[pP]ath)\s*[=:]\s*\{?\s*(["'`])(\/[^"'`]*)\1/g,
  // router.push("/x"), redirect(`/x`)
  /(?:push|replace|redirect)\(\s*(["'`])(\/[^"'`]*)\1/g,
];

function internalLinks(): { file: string; link: string }[] {
  const found: { file: string; link: string }[] = [];
  for (const file of walk(SRC)) {
    if (!/\.(ts|tsx)$/.test(file) || /\.test\.ts$/.test(file) || SCAN_SKIP.some((skip) => file.startsWith(skip))) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const re of LITERALS) {
      for (const match of text.matchAll(re)) {
        const link = match[2]
          .replace(/\$\{[^}]*\}/g, "x") // a placeholder segment, such as an id
          .split(/[?#]/)[0];
        found.push({ file: path.relative(SRC, file).replaceAll("\\", "/"), link: link === "" ? "/" : link });
      }
    }
  }
  return found;
}

describe("internal links", () => {
  const pages = pagePatterns();
  const links = internalLinks();

  it("finds the pages and links it is supposed to check", () => {
    // 16 real pages. The temporary /test-passkey page was removed (see docs/DECISIONS.md).
    expect(pages.length).toBeGreaterThanOrEqual(16);
    expect(links.length).toBeGreaterThanOrEqual(40);
  });

  it("lists the pages that must exist", () => {
    const routes = pages.map((p) => p.route);
    for (const route of [
      "/",
      "/how-it-works",
      "/privacy",
      "/proof",
      "/faq",
      "/about",
      "/stats",
      "/legal/[doc]",
      "/start",
      "/groups",
      "/create",
      "/me",
      "/g/[groupId]",
      "/g/[groupId]/new",
      "/g/[groupId]/me",
      "/g/[groupId]/p/[proposalId]",
      "/embed/p/[proposalId]",
    ]) {
      expect(routes, `missing page ${route}`).toContain(route);
    }
  });

  it("points every internal link at an existing page", () => {
    // Links made with the app's own Link have no language prefix; a plain link may spell out "/en".
    const withoutLocale = (link: string) => link.replace(/^\/en(?=\/|$)/, "") || "/";
    // Static pages served from public/ (no language, no route file). The crawl test checks that they answer 200.
    const STATIC = ["/branding-votalo"];
    const dead = links.filter(({ link }) => !STATIC.includes(link) && !pages.some(({ pattern }) => pattern.test(withoutLocale(link))));
    expect(dead, `dead links:\n${dead.map((d) => `  ${d.link}  (${d.file})`).join("\n")}`).toEqual([]);
  });

  it("serves only the legal documents that exist", () => {
    // "/legal/x" is a template such as `/legal/${doc}` with its placeholder filled in, not a link to a document.
    const legal = links.filter(({ link }) => link.startsWith("/legal/") && link !== "/legal/x").map(({ link }) => link);
    for (const link of legal) expect(["/legal/privacy", "/legal/terms"], link).toContain(link);
  });
});
