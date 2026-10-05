import { useTranslations } from "next-intl";
import { ViewTransition, type ReactNode } from "react";
import { Footer } from "./footer";
import { Navbar } from "./navbar";

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

/** Skip link, navbar, page body and footer: shared by the marketing pages and the catch-all 404. */
export function MarketingChrome({ children }: { children: ReactNode }) {
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
