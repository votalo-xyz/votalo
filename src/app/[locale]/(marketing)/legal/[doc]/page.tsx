import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/landing/page-header";
import { GITHUB_URL } from "@/components/site";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const DOCS = ["privacy", "terms"] as const;
type Doc = (typeof DOCS)[number];

/** Bump when a legal text changes. */
const UPDATED = "2026-10-05T12:00:00Z";

type Section = { title: string; body: string };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => DOCS.map((doc) => ({ locale, doc })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; doc: string }> }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { doc } = await params;
  if (!DOCS.includes(doc as Doc)) return {};
  const t = await getTranslations({ locale, namespace: "Legal" });
  return { title: t(`${doc as Doc}.title`) };
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string; doc: string }> }) {
  const locale = await resolveLocale(params);
  const { doc } = await params;
  if (!DOCS.includes(doc as Doc)) notFound();

  const t = await getTranslations({ locale, namespace: "Legal" });
  const format = await getFormatter({ locale });
  const sections = t.raw(`${doc as Doc}.sections`) as Section[];
  const updated = format.dateTime(new Date(UPDATED), { dateStyle: "long", timeZone: "UTC" });

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <PageHeader title={t(`${doc as Doc}.title`)} lead={t("updated", { date: updated })} />

      <div className="mt-12 flex flex-col gap-9">
        {sections.map((section, i) => (
          <section key={section.title} aria-labelledby={`s${i}`}>
            <h2 id={`s${i}`} className="text-h3">
              {i + 1}. {section.title}
            </h2>
            <p className="mt-3 text-muted">{section.body}</p>
          </section>
        ))}

        <section aria-labelledby="contact">
          <h2 id="contact" className="text-h3">
            {t("contactTitle")}
          </h2>
          <p className="mt-3 text-muted">{t("contactBody")}</p>
          <a
            href={`${GITHUB_URL}/issues`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-11 items-center font-semibold text-accent-text underline-offset-4 hover:underline"
          >
            {t("contactLink")}
          </a>
        </section>
      </div>

      <p className="mt-12 text-sm text-muted">{t("notAdvice")}</p>
      <Link href="/" className={cn(buttonVariants({ variant: "secondary" }), "mt-6")}>
        {t("home")}
      </Link>
    </article>
  );
}
