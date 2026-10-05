"use client";

import { Settings2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitch } from "../layout/language-switch";
import { ThemeToggle } from "../layout/theme-toggle";
import { Button } from "../ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "../ui/sheet";

/** Language and theme, tucked into a sheet so the phone top bar stays compact. */
export function SettingsSheet() {
  const t = useTranslations("Shell");
  const c = useTranslations("Common");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("settings")}>
          <Settings2 aria-hidden="true" className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <SheetTitle className="text-h3">{t("settings")}</SheetTitle>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label={c("close")}>
              <X aria-hidden="true" className="size-5" />
            </Button>
          </SheetClose>
        </div>
        <SheetDescription className="sr-only">{t("settingsDescription")}</SheetDescription>
        <div className="flex flex-col gap-5 px-5 pb-6 pt-3">
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">{c("language")}</span>
            <LanguageSwitch />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">{t("theme")}</span>
            <ThemeToggle className="border border-line-strong bg-surface" />
          </div>
          <SheetClose asChild>
            <Link href="/" className="inline-flex min-h-11 items-center font-medium text-accent-text underline-offset-4 hover:underline">
              {t("toSite")}
            </Link>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
