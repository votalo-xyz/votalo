import { ArrowUpRight, FileCheck2, GitBranch, Radio } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LiveStatsGrid } from "@/components/landing/live-stats";
import { MoreLink } from "@/components/landing/more-link";
import { PageHeader } from "@/components/landing/page-header";
import { CONTRACT_ADDRESS, CONTRACT_URL, GITHUB_URL } from "@/components/site";
import { Reveal } from "@/components/ui/reveal";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return pageMetadata({ locale, path: "/proof", title: (await getTranslations({ locale, namespace: "ProofPage" }))("metaTitle") });
}

const STEPS = ["one", "two", "three", "four"] as const;
const external =
  "mt-5 inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent-text underline-offset-4 hover:underline";

export default async function ProofPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "ProofPage" });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
      <PageHeader title={t("title")} lead={t("lead")} />

      <div className="mt-14 grid gap-4 md:grid-cols-2">
        <Reveal as="section" className="surface-card flex flex-col rounded-4xl p-7 sm:p-8 md:col-span-2">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-2">
            <FileCheck2 aria-hidden="true" className="size-6 text-success-text" />
          </span>
          <h2 className="text-h3 mt-5">{t("contract.title")}</h2>
          <p className="mt-3 text-muted">{t("contract.body")}</p>
          <dl className="mt-5 grid gap-1">
            <dt className="text-sm text-muted">{t("contract.address")}</dt>
            <dd className="break-all font-mono text-sm sm:text-base">{CONTRACT_ADDRESS}</dd>
            <dd className="mt-1 text-sm text-muted">{t("contract.network")}</dd>
          </dl>
          <a className={external} href={CONTRACT_URL} target="_blank" rel="noopener noreferrer">
            {t("contract.link")}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </Reveal>

        <Reveal as="section" delay={0.05} className="surface-card flex flex-col rounded-4xl p-7 sm:p-8">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-2">
            <GitBranch aria-hidden="true" className="size-6" />
          </span>
          <h2 className="text-h3 mt-5">{t("code.title")}</h2>
          <p className="mt-3 text-muted">{t("code.body")}</p>
          <a className={external} href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            {t("code.link")}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </Reveal>

        <Reveal as="section" delay={0.1} className="surface-card flex flex-col rounded-4xl p-7 sm:p-8">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-2">
            <Radio aria-hidden="true" className="size-6 text-identity" />
          </span>
          <h2 className="text-h3 mt-5">{t("live.title")}</h2>
          <p className="mt-3 text-muted">{t("live.body")}</p>
          <LiveStatsGrid />
          <MoreLink href="/stats" className="mt-5">
            {t("live.link")}
          </MoreLink>
        </Reveal>
      </div>

      <Reveal as="section" className="mt-14">
        <h2 className="text-h2">{t("steps.title")}</h2>
        <p className="text-lead mt-3 text-muted">{t("steps.lead")}</p>
        <ol className="mt-8 flex flex-col gap-3">
          {STEPS.map((step, i) => (
            <li key={step} className="surface-card flex items-start gap-5 rounded-3xl p-5 sm:p-6">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-identity-soft font-display font-extrabold text-identity"
              >
                {i + 1}
              </span>
              <span className="pt-1">{t(`steps.items.${step}`)}</span>
            </li>
          ))}
        </ol>
      </Reveal>

      <p className="mt-10 text-sm text-muted">{t("testnet")}</p>
    </div>
  );
}
