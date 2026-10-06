/** The Spanish and English messages must have exactly the same keys, so no page shows a raw key in either language. */
import { describe, expect, it } from "vitest";
import en from "./en.json";
import es from "./es.json";

function keys(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) return value.flatMap((item, i) => keys(item, `${prefix}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

describe("messages", () => {
  it("has the same keys in Spanish and English", () => {
    const a = new Set(keys(es));
    const b = new Set(keys(en));
    expect([...a].filter((k) => !b.has(k)), "missing in en.json").toEqual([]);
    expect([...b].filter((k) => !a.has(k)), "missing in es.json").toEqual([]);
  });
});
