"use client";

import { ChevronLeft, CirclePlus, UserRound, UsersRound, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ViewTransition, type ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo, LogoMark } from "../brand/logo";
import { InstallCard } from "../pwa/install-card";
import { cn } from "../ui/cn";
import { SettingsSheet } from "./settings-sheet";
import { ShellHeaderProvider, useShellHeader } from "./shell-title";

const TABS: { key: "groups" | "create" | "me"; href: string; icon: LucideIcon }[] = [
  { key: "groups", href: "/groups", icon: UsersRound },
  { key: "create", href: "/create", icon: CirclePlus },
  { key: "me", href: "/me", icon: UserRound },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TopBar() {
  const t = useTranslations("Shell");
  const c = useTranslations("Common");
  const pathname = usePathname();
  const { title, backHref } = useShellHeader();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[var(--nav-bg)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-1 px-2 sm:px-4">
        {backHref ? (
          <Link
            href={backHref}
            aria-label={c("back")}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-2"
          >
            <ChevronLeft aria-hidden="true" className="size-6" />
          </Link>
        ) : (
          <Link href="/" aria-label={t("toSite")} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full">
            <LogoMark />
          </Link>
        )}

        <p className="min-w-0 flex-1 truncate px-1 font-display text-lg font-semibold tracking-tight">
          {title ?? <Logo className="[&>svg]:hidden" />}
        </p>

        {/* Desktop: the three tabs live up here. Phones get the bottom bar instead. */}
        <nav aria-label={t("tabs")} className="hidden items-center gap-1 md:flex">
          {TABS.map(({ key, href, icon: Icon }) => (
            <Link
              key={key}
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[0.95rem] font-medium transition-colors",
                isActive(pathname, href) ? "bg-identity-soft text-identity" : "text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              <Icon aria-hidden="true" className="size-[1.15rem]" />
              {t(`tab.${key}`)}
            </Link>
          ))}
        </nav>
        <SettingsSheet />
      </div>
    </header>
  );
}

function TabBar() {
  const t = useTranslations("Shell");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("tabs")}
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[var(--nav-bg)] backdrop-blur-xl backdrop-saturate-150 md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3 gap-1 px-2 pt-1.5">
        {TABS.map(({ key, href, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-semibold transition-colors",
                  active ? "bg-identity-soft text-identity" : "text-muted active:bg-surface-2",
                )}
              >
                <Icon aria-hidden="true" className="size-6" />
                {t(`tab.${key}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** App shell: compact top bar, centered column, and a bottom tab bar on phones. */
export function AppShell({ children }: { children: ReactNode }) {
  const c = useTranslations("Common");

  return (
    <ShellHeaderProvider>
      <a
        href="#main"
        className="fixed left-4 top-4 z-[90] -translate-y-24 rounded-full bg-accent px-5 py-3 font-semibold text-accent-fg transition-transform focus:translate-y-0"
      >
        {c("skipToContent")}
      </a>
      <TopBar />
      <ViewTransition default="none" enter="page-swap" exit="page-swap">
        <main id="main" className="mx-auto w-full max-w-3xl px-4 pb-32 pt-6 sm:pt-10 md:pb-16">
          <div className="mb-8 empty:hidden">
            <InstallCard />
          </div>
          {children}
        </main>
      </ViewTransition>
      <TabBar />
    </ShellHeaderProvider>
  );
}
