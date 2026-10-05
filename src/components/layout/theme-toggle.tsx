"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { cn } from "../ui/cn";

/** Both icons are in the DOM and CSS picks one, so there is no mismatch before the theme loads. */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("Common");
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label={t("toggleTheme")}
      title={t("toggleTheme")}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full text-fg transition-[background-color,transform] duration-200 hover:bg-surface-2 active:scale-90",
        className,
      )}
    >
      <Sun aria-hidden="true" className="size-5 dark:hidden" />
      <Moon aria-hidden="true" className="hidden size-5 dark:block" />
    </button>
  );
}
