import { useTranslations } from "next-intl";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-start justify-center gap-5 px-4 py-20 sm:px-6">
        <p className="font-display text-7xl font-extrabold tracking-tighter text-fg/15" aria-hidden="true">
          404
        </p>
        <h1 className="text-h2">{t("title")}</h1>
        <p className="text-lead text-muted">{t("body")}</p>
        <Link href="/" className={buttonVariants({ className: "mt-2" })}>
          {t("home")}
        </Link>
      </main>
      <Footer />
    </>
  );
}
