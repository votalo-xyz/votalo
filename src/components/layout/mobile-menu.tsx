"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Logo } from "../brand/logo";
import { Button, buttonVariants } from "../ui/button";
import { cn } from "../ui/cn";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "../ui/sheet";
import { LanguageSwitch } from "./language-switch";
import { NavLink } from "./nav-link";
import { NAV_SECTIONS } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

/** Sheet menu for phones. Keeps the language and theme toggles. */
export function MobileMenu() {
  const t = useTranslations("Nav");
  const c = useTranslations("Common");
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("openMenu")} className="lg:hidden">
          <Menu aria-hidden="true" className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <div className="flex items-center justify-between px-5 py-4">
          <SheetTitle asChild>
            <span>
              <Logo />
              <span className="sr-only">{t("menu")}</span>
            </span>
          </SheetTitle>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label={c("close")}>
              <X aria-hidden="true" className="size-6" />
            </Button>
          </SheetClose>
        </div>
        <SheetDescription className="sr-only">{t("menuDescription")}</SheetDescription>
        <nav aria-label={t("menu")} className="flex flex-1 flex-col gap-1 px-3">
          {NAV_SECTIONS.map(({ key, href }) => (
            <SheetClose asChild key={key}>
              <NavLink
                href={href}
                className="flex min-h-14 items-center rounded-2xl px-4 font-display text-2xl font-semibold tracking-tight hover:bg-surface-2"
                activeClassName="bg-surface-2"
              >
                {t(key)}
              </NavLink>
            </SheetClose>
          ))}
        </nav>
        <div className="flex flex-col gap-5 border-t border-line p-5">
          <div className="flex items-center justify-between">
            <LanguageSwitch />
            <ThemeToggle className="border border-line-strong bg-surface" />
          </div>
          <SheetClose asChild>
            <Link href="/create" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
              {c("createGroup")}
            </Link>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
