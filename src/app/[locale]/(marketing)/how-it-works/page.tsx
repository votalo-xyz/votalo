import { ChartPie, Check, Fingerprint, Link2, LockKeyhole, Unlock } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CredentialsSection } from "@/components/landing/credentials-section";
import { PageHeader } from "@/components/landing/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Reveal } from "@/components/ui/reveal";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/seo/metadata";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return pageMetadata({ locale, path: "/how-it-works", title: (await getTranslations({ locale, namespace: "HowPage" }))("metaTitle") });
}

const STEPS = [
  { key: "create", icon: Link2 },
  { key: "vote", icon: Fingerprint },
  { key: "results", icon: ChartPie },
] as const;
const DETAILS = ["one", "two", "three"] as const;

export default async function HowItWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "HowPage" });
  const steps = await getTranslations({ locale, namespace: "Steps" });
  const c = await getTranslations({ locale, namespace: "Common" });

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 pb-6 pt-14 sm:px-6 sm:pt-20">
        <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />

        <ol className="mt-14 flex flex-col gap-5">
          {STEPS.map(({ key, icon: Icon }, i) => (
            <Reveal as="li" key={key} className="surface-card grid gap-6 rounded-4xl p-7 sm:p-9 md:grid-cols-[1fr_1.1fr] md:gap-12">
              <div>
                <p className="text-eyebrow text-muted">{t("stepLabel", { n: i + 1 })}</p>
                <span className="mt-4 flex size-12 items-center justify-center rounded-2xl bg-identity-soft text-identity">
                  <Icon aria-hidden="true" className="size-6" />
                </span>
                <h2 className="text-h3 mt-5">{steps(`items.${key}.title`)}</h2>
                <p className="mt-3 text-muted">{steps(`items.${key}.body`)}</p>
              </div>
              <ul className="flex flex-col justify-center gap-4">
                {DETAILS.map((d) => (
                  <li key={d} className="flex gap-3">
                    <Check aria-hidden="true" className="mt-1 size-5 shrink-0 text-success-text" strokeWidth={3} />
                    <span>{t(`details.${key}.${d}`)}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </ol>
      </div>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <Reveal>
          <h2 className="text-h2">{t("entry.title")}</h2>
          <p className="text-lead mt-4 text-muted">{t("entry.lead")}</p>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {(["open", "invite"] as const).map((mode, i) => {
            const Icon = mode === "open" ? Unlock : LockKeyhole;
            return (
              <Reveal key={mode} delay={i * 0.08} className="surface-card flex flex-col gap-3 rounded-3xl p-7">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-surface-2">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="text-h3">{t(`entry.${mode}.title`)}</h3>
                <p className="text-muted">{t(`entry.${mode}.body`)}</p>
                <p className="text-sm text-muted">{t(`entry.${mode}.note`)}</p>
              </Reveal>
            );
          })}
        </div>
      </section>

      <CredentialsSection />

      <section className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6">
        <Reveal className="surface-card flex flex-col items-start gap-5 rounded-4xl p-8 sm:p-12">
          <h2 className="text-h2">{t("cta.title")}</h2>
          <p className="text-lead text-muted">{t("cta.body")}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/create" className={buttonVariants({ size: "lg" })}>
              {c("createGroup")}
            </Link>
            <Link href="/faq" className={cn(buttonVariants({ size: "lg", variant: "secondary" }))}>
              {t("cta.faq")}
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
