import { describe, expect, it } from "vitest";
import { EMBED_SOURCES, FRAME_ANY, FRAME_SELF, frameHeaders } from "./frame-headers";

describe("frame-ancestors rules", () => {
  const rules = frameHeaders();
  const cspOf = (rule: (typeof rules)[number]) => rule.headers.find((h) => h.key === "Content-Security-Policy")?.value;

  it("keeps everything non-frameable by default", () => {
    expect(rules[0].source).toBe("/:path*");
    expect(cspOf(rules[0])).toBe(FRAME_SELF);
    expect(FRAME_SELF).toBe("frame-ancestors 'self'");
  });

  it("allows any site to frame the widget, in every form its address can take", () => {
    const embedRules = rules.slice(1);
    expect(embedRules.map((r) => r.source)).toEqual([...EMBED_SOURCES]);
    expect(EMBED_SOURCES).toEqual(expect.arrayContaining(["/embed/:path*", "/en/embed/:path*"]));
    for (const rule of embedRules) expect(cspOf(rule)).toBe(FRAME_ANY);
    expect(FRAME_ANY).toBe("frame-ancestors *");
  });

  it("puts the embed rules after the catch-all, because the last matching rule wins", () => {
    const catchAll = rules.findIndex((r) => r.source === "/:path*");
    const firstEmbed = rules.findIndex((r) => r.source.includes("embed"));
    expect(catchAll).toBeLessThan(firstEmbed);
  });

  it("never sets X-Frame-Options, which cannot express 'any site' and would block the widget", () => {
    for (const rule of rules) expect(rule.headers.some((h) => h.key.toLowerCase() === "x-frame-options")).toBe(false);
  });
});
