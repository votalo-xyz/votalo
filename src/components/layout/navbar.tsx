import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "../brand/logo";
import { buttonVariants } from "../ui/button";
import { cn } from "../ui/cn";
import { LanguageSwitch } from "./language-switch";
import { MobileMenu } from "./mobile-menu";
import { NavLink } from "./nav-link";
import { NAV_SECTIONS } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

/** Sticky, translucent marketing navbar. */
export function Navbar() {
  const t = useTranslations("Nav");
  const c = useTranslations("Common");

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-[var(--nav-bg)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label={t("home")} className="rounded-full">
          <Logo />
        </Link>

        <nav aria-label={t("menu")} className="hidden items-center gap-1 lg:flex">
          {NAV_SECTIONS.map(({ key, href }) => (
            <NavLink
              key={key}
              href={href}
              className="inline-flex min-h-11 items-center rounded-full px-4 text-[0.95rem] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
              activeClassName="bg-surface-2 text-fg"
            >
              {t(key)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            <LanguageSwitch />
            <ThemeToggle />
          </div>
          <Link href="/create" className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}>
            {c("createGroup")}
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
