import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const DOCS = ["privacy", "terms"] as const;
type Doc = (typeof DOCS)[number];

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => DOCS.map((doc) => ({ locale, doc })));
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string; doc: string }> }) {
  const { doc } = await params;
  await resolveLocale(params);
  if (!DOCS.includes(doc as Doc)) notFound();
  const t = await getTranslations("Legal");

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 sm:py-28">
      <h1 className="text-h2">{t(`${doc as Doc}.title`)}</h1>
      <p className="mt-6 text-lead text-muted">{t(`${doc as Doc}.body`)}</p>
      <Link href="/" className={buttonVariants({ variant: "secondary", class: "mt-10" })}>
        {t("home")}
      </Link>
    </div>
  );
}
