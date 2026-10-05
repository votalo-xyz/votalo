import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { StartScreen } from "@/components/passkey/start-screen";
import { resolveLocale } from "@/i18n/locale";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Onboarding" });
  return { title: t("metaTitle") };
}

export default async function StartPage({ params }: { params: Promise<{ locale: string }> }) {
  await resolveLocale(params);
  return (
    <div className="mx-auto max-w-xl pt-4 sm:pt-12">
      <Suspense fallback={null}>
        <StartScreen />
      </Suspense>
    </div>
  );
}
