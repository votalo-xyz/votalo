import type { ReactNode } from "react";
import { MarketingChrome } from "@/components/layout/marketing-chrome";
import { resolveLocale } from "@/i18n/locale";

export default async function MarketingLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await resolveLocale(params);
  return <MarketingChrome>{children}</MarketingChrome>;
}
