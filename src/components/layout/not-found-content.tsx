import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "../ui/button";

/** The branded 404 message. Each area renders it inside its own layout, so the visitor keeps their navigation. */
export function NotFoundContent() {
  const t = useTranslations("NotFound");
  return (
    <div className="mx-auto flex min-h-[55vh] w-full max-w-xl flex-col items-start justify-center gap-5 px-4 py-20 sm:px-6">
      <p className="font-display text-7xl font-extrabold tracking-tighter text-fg/15" aria-hidden="true">
        404
      </p>
      <h1 className="text-h2">{t("title")}</h1>
      <p className="text-lead text-muted">{t("body")}</p>
      <Link href="/" className={buttonVariants({ className: "mt-2" })}>
        {t("home")}
      </Link>
    </div>
  );
}
