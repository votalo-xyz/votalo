import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "../brand/logo";
import { CONTRACT_URL, DOCS_URL, GITHUB_URL, MONAD_URL } from "../site";
import { LanguageSwitch } from "./language-switch";
import { ThemeToggle } from "./theme-toggle";

const linkClass = "inline-flex min-h-11 items-center text-[0.95rem] text-muted transition-colors hover:text-fg";

function External({ href, children }: { href: string; children: React.ReactNode }) {
  const t = useTranslations("Footer");
  return (
    <a className={linkClass} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> ({t("newTab")})</span>
    </a>
  );
}

export function Footer() {
  const t = useTranslations("Footer");
  const n = useTranslations("Nav");

  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-12 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-xs sm:col-span-2 md:col-span-1">
            <Logo />
            <p className="mt-4 text-muted">{t("tagline")}</p>
            <div className="mt-6 flex items-center gap-2">
              <LanguageSwitch />
              <ThemeToggle className="border border-line-strong" />
            </div>
          </div>

          <nav aria-label={t("product")}>
            <h2 className="text-eyebrow text-muted">{t("product")}</h2>
            <ul className="mt-3">
              <li>
                <Link className={linkClass} href="/#how">
                  {n("how")}
                </Link>
              </li>
              <li>
                <Link className={linkClass} href="/#privacy">
                  {n("privacy")}
                </Link>
              </li>
              <li>
                <Link className={linkClass} href="/#proof">
                  {n("proof")}
                </Link>
              </li>
              <li>
                <Link className={linkClass} href="/#faq">
                  {n("faq")}
                </Link>
              </li>
              <li>
                <Link className={linkClass} href="/stats">
                  {t("stats")}
                </Link>
              </li>
              <li>
                <Link className={linkClass} href="/about">
                  {t("about")}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label={t("resources")}>
            <h2 className="text-eyebrow text-muted">{t("resources")}</h2>
            <ul className="mt-3">
              <li>
                <External href={GITHUB_URL}>GitHub</External>
              </li>
              <li>
                <External href={CONTRACT_URL}>{t("contract")}</External>
              </li>
              <li>
                <External href={DOCS_URL}>{t("docs")}</External>
              </li>
            </ul>
          </nav>

          <nav aria-label={t("legal")}>
            <h2 className="text-eyebrow text-muted">{t("legal")}</h2>
            <ul className="mt-3">
              <li>
                <Link className={linkClass} href="/legal/privacy">
                  {t("privacyNotice")}
                </Link>
              </li>
              <li>
                <Link className={linkClass} href="/legal/terms">
                  {t("terms")}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <p className="mt-12 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-6 text-sm text-muted">
          <span>
            {t("builtOn")}{" "}
            <a
              className="font-semibold text-fg underline-offset-4 hover:underline"
              href={MONAD_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Monad
            </a>
          </span>
          <span aria-hidden="true">·</span>
          <span>{t("openSource")}</span>
          <span aria-hidden="true">·</span>
          <span>{t("copyright")}</span>
        </p>
      </div>
    </footer>
  );
}
