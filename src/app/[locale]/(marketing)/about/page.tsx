import { ArrowUpRight, Fingerprint, FileCheck2, GitBranch, TriangleAlert, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CredentialBadge } from "@/components/brand/credential-badge";
import { CONTRACT_URL, GITHUB_URL } from "@/components/site";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/seo/metadata";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return pageMetadata({ locale, path: "/about", title: (await getTranslations({ locale, namespace: "About" }))("metaTitle") });
}

const LIMITS = ["secret", "passkeys", "invite", "late", "ip"] as const;
const linkClass =
  "mt-4 inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent-text underline-offset-4 hover:underline";

// The same illustration addresses as the landing page: they belong to no one.
const EXAMPLES = [
  "0x028aa908863571a011e2cb77be9bf2931b4c39c7",
  "0x75f11a60184e22dde12abcbf568b6e0ee8f7f3b2",
  "0x7b626c9d4f84202af61c206ea63aad6aadd7ecd8",
];

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "About" });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <header>
        <h1 className="text-display !text-[clamp(2.2rem,1.4rem+3.6vw,3.8rem)]">{t("title")}</h1>
        <p className="text-lead mt-5 text-muted">{t("lead")}</p>
      </header>

      <div className="mt-14 flex flex-col gap-14">
        <Reveal as="section">
          <h2 className="text-h3 flex items-center gap-3">
            <UsersRound aria-hidden="true" className="size-6 text-identity" />
            {t("what.title")}
          </h2>
          <p className="mt-4 text-lead text-muted">{t("what.body")}</p>
        </Reveal>

        <Reveal as="section">
          <h2 id="identity" className="text-h3 flex items-center gap-3">
            <Fingerprint aria-hidden="true" className="size-6 text-identity" />
            {t("identity.title")}
          </h2>
          <p className="mt-4 text-lead text-muted">{t("identity.body")}</p>
          <div className="mt-6 flex gap-3" aria-hidden="true">
            {EXAMPLES.map((address) => (
              <CredentialBadge key={address} address={address} size={72} />
            ))}
          </div>
        </Reveal>

        <Reveal as="section">
          <h2 className="text-h3 flex items-center gap-3">
            <FileCheck2 aria-hidden="true" className="size-6 text-success-text" />
            {t("monad.title")}
          </h2>
          <p className="mt-4 text-lead text-muted">{t("monad.body")}</p>
          <a className={linkClass} href={CONTRACT_URL} target="_blank" rel="noopener noreferrer">
            {t("monad.link")}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </Reveal>

        <Reveal as="section">
          <h2 className="text-h3 flex items-center gap-3">
            <TriangleAlert aria-hidden="true" className="size-6 text-accent-text" />
            {t("limits.title")}
          </h2>
          <ul className="mt-5 flex flex-col gap-3">
            {LIMITS.map((key) => (
              <li key={key} className="surface-card flex gap-4 rounded-3xl p-5 text-muted">
                <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-accent-text" />
                {t(`limits.items.${key}`)}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal as="section">
          <h2 className="text-h3 flex items-center gap-3">
            <GitBranch aria-hidden="true" className="size-6" />
            {t("open.title")}
          </h2>
          <p className="mt-4 text-lead text-muted">{t("open.body")}</p>
          <a className={linkClass} href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            {t("open.link")}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </Reveal>

        <Link href="/create" className={buttonVariants({ size: "lg", className: "self-start" })}>
          {t("cta")}
        </Link>
      </div>
    </div>
  );
}
