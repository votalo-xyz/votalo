import { useTranslations } from "next-intl";
import { ViewTransition, type ReactNode } from "react";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { resolveLocale } from "@/i18n/locale";

function SkipLink() {
  const t = useTranslations("Common");
  return (
    <a
      href="#main"
      className="fixed left-4 top-4 z-[90] -translate-y-24 rounded-full bg-accent px-5 py-3 font-semibold text-accent-fg transition-transform focus:translate-y-0"
    >
      {t("skipToContent")}
    </a>
  );
}

export default async function MarketingLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await resolveLocale(params);

  return (
    <>
      <SkipLink />
      <Navbar />
      <ViewTransition default="none" enter="page-swap" exit="page-swap">
        <main id="main" className="overflow-x-clip">
          {children}
        </main>
      </ViewTransition>
      <Footer />
    </>
  );
}
