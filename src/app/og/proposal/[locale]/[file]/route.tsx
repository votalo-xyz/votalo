import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { isHex32 } from "@/components/ids";
import { routing } from "@/i18n/routing";
import { OG_SIZE, ShareCard, ogFonts } from "@/seo/og";
import { readProposalTitle } from "@/seo/data";

/**
 * Share card for one proposal: its real question when the data service has it, a generic card when not.
 * The path ends in ".png" so the language proxy leaves it alone and previews get the image with a 200.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; file: string }> }) {
  const { locale: rawLocale, file } = await params;
  const locale = routing.locales.find((l) => l === rawLocale);
  const id = file.replace(/\.png$/, "");
  if (!locale || !file.endsWith(".png") || !isHex32(id)) return new Response("Not found", { status: 404 });

  const t = await getTranslations({ locale, namespace: "Proposal" });
  const title = await readProposalTitle(id);
  const headline = title ?? t("ogTitle");
  const size = headline.length <= 40 ? 76 : headline.length <= 80 ? 62 : 50;

  return new ImageResponse(<ShareCard headline={headline} tagline={t("ogTagline")} headlineSize={size} />, {
    ...OG_SIZE,
    fonts: await ogFonts(),
    // A question never changes, so the real card can be kept for a day. The generic one (data service
    // unavailable) is only kept for minutes, so the real title replaces it as soon as it can be read.
    headers: { "Cache-Control": title ? "public, max-age=86400, s-maxage=86400" : "public, max-age=300, s-maxage=300" },
  });
}
