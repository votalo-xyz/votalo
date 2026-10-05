import { ArrowUpRight, FileCheck2, GitBranch, Radio } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { shortAddress } from "../format";
import { CONTRACT_ADDRESS, CONTRACT_URL, GITHUB_URL } from "../site";
import { Reveal } from "../ui/reveal";
import { LiveStatsGrid } from "./live-stats";
import { MoreLink } from "./more-link";

const linkClass =
  "mt-5 inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent-text underline-offset-4 hover:underline";

export function ProofSection() {
  const t = useTranslations("Proof");
  const more = useTranslations("Landing.more");

  return (
    <section id="proof" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <Reveal className="max-w-3xl">
        <p className="text-eyebrow text-accent-text">{t("eyebrow")}</p>
        <h2 className="text-h2 mt-3">{t("title")}</h2>
        <p className="text-lead mt-5 text-muted">{t("lead")}</p>
      </Reveal>

      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        <Reveal className="surface-card flex flex-col rounded-3xl p-7">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-2">
            <FileCheck2 aria-hidden="true" className="size-6 text-success-text" />
          </span>
          <h3 className="text-h3 mt-5">{t("contract.title")}</h3>
          <p className="mt-3 text-muted">{t("contract.body")}</p>
          <p className="mt-4 font-mono text-sm text-muted">{shortAddress(CONTRACT_ADDRESS, 8, 6)}</p>
          <a className={linkClass} href={CONTRACT_URL} target="_blank" rel="noopener noreferrer">
            {t("contract.link")}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </Reveal>

        <Reveal delay={0.08} className="surface-card flex flex-col rounded-3xl p-7">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-2">
            <GitBranch aria-hidden="true" className="size-6" />
          </span>
          <h3 className="text-h3 mt-5">{t("code.title")}</h3>
          <p className="mt-3 text-muted">{t("code.body")}</p>
          <a className={linkClass} href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            {t("code.link")}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </Reveal>

        <Reveal delay={0.16} className="surface-card flex flex-col rounded-3xl p-7">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-2">
            <Radio aria-hidden="true" className="size-6 text-identity" />
          </span>
          <h3 className="text-h3 mt-5">{t("stats.title")}</h3>
          <p className="mt-3 text-muted">{t("stats.body")}</p>
          <LiveStatsGrid />
          <Link href="/stats" className={linkClass}>
            {t("stats.link")}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </Reveal>
      </div>

      <p className="mt-6 text-sm text-muted">{t("testnet")}</p>
      <MoreLink href="/proof" className="mt-4">
        {more("proof")}
      </MoreLink>
    </section>
  );
}
