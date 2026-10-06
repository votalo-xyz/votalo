import { ArrowRight, Eye, EyeOff, Network, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/landing/page-header";
import { Reveal } from "@/components/ui/reveal";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/seo/metadata";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return pageMetadata({ locale, path: "/privacy", title: (await getTranslations({ locale, namespace: "PrivacyPage" }))("metaTitle") });
}

const SECTIONS: { key: "sees" | "hidden" | "service" | "limits"; icon: LucideIcon; items: string[]; tone: string }[] = [
  { key: "sees", icon: Eye, items: ["votes", "counts", "public"], tone: "text-identity" },
  { key: "hidden", icon: EyeOff, items: ["details", "biometrics", "groups"], tone: "text-success-text" },
  { key: "service", icon: Network, items: ["ip", "never"], tone: "text-fg" },
  { key: "limits", icon: TriangleAlert, items: ["secret", "forever", "passkeys"], tone: "text-accent-text" },
];

const linkClass =
  "group inline-flex min-h-11 items-center gap-2 font-semibold text-accent-text underline-offset-4 hover:underline";

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "PrivacyPage" });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
      <PageHeader title={t("title")} lead={t("lead")} />

      <div className="mt-14 flex flex-col gap-5">
        {SECTIONS.map(({ key, icon: Icon, items, tone }, i) => (
          <Reveal as="section" key={key} delay={(i % 2) * 0.05} className="surface-card rounded-4xl p-7 sm:p-9">
            <h2 className="text-h3 flex items-center gap-3">
              <Icon aria-hidden="true" className={`size-6 ${tone}`} />
              {t(`${key}.title`)}
            </h2>
            <ul className="mt-5 flex flex-col gap-4">
              {items.map((item) => (
                <li key={item} className="flex gap-4 text-muted">
                  <span aria-hidden="true" className="mt-2.5 size-2 shrink-0 rounded-full bg-current opacity-70" />
                  {/* Each section lists its own items above, so the key always exists. */}
                  <span>{t(`${key}.items.${item}` as Parameters<typeof t>[0])}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-12">
        <h2 className="text-h3">{t("more.title")}</h2>
        <div className="mt-3 flex flex-col items-start">
          <Link href="/legal/privacy" className={linkClass}>
            {t("more.policy")}
            <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link href="/faq" className={linkClass}>
            {t("more.faq")}
            <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
