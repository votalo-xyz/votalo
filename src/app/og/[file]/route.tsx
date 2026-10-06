import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { OG_SIZE, ShareCard, ogFonts } from "@/seo/og";

// One card per language, drawn once at build time and served as a plain 200 PNG. The ".png" in the path keeps
// it out of the language proxy (which would redirect or rewrite it), so link previews get the image directly.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ file: `${locale}.png` }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const locale = routing.locales.find((l) => `${l}.png` === file) ?? routing.defaultLocale;
  const hero = await getTranslations({ locale, namespace: "Hero" });
  const footer = await getTranslations({ locale, namespace: "Footer" });

  return new ImageResponse(<ShareCard headline={hero("title")} tagline={footer("tagline")} />, {
    ...OG_SIZE,
    fonts: await ogFonts(),
    // An hour in browsers, a day on the CDN, and stale copies are fine while a new one is fetched: cards change rarely.
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
