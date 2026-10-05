import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FAQ_KEYS, FaqList } from "@/components/landing/faq-list";
import { PageHeader } from "@/components/landing/page-header";
import { GITHUB_URL } from "@/components/site";
import { Reveal } from "@/components/ui/reveal";
import { resolveLocale } from "@/i18n/locale";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return { title: (await getTranslations({ locale, namespace: "FaqPage" }))("metaTitle") };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "FaqPage" });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <PageHeader title={t("title")} lead={t("lead")} />
      <Reveal className="mt-12">
        <FaqList keys={FAQ_KEYS} />
      </Reveal>
      <p className="mt-10 text-muted">
        {t("contact")}{" "}
        <a
          href={`${GITHUB_URL}/issues`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-accent-text underline-offset-4 hover:underline"
        >
          {t("contactLink")}
        </a>
      </p>
    </div>
  );
}
