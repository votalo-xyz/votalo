import type { ReactNode } from "react";
import { cn } from "../ui/cn";

export type EmbedTheme = "dark" | "light";

/** `?theme=light` is light; anything else (including nothing) is dark, the site's default. */
export function themeFromParam(value: string | string[] | undefined): EmbedTheme {
  return (Array.isArray(value) ? value[0] : value) === "light" ? "light" : "dark";
}

/**
 * Scopes the colour tokens to this widget, whatever theme the visitor has saved for Votalo itself. The
 * widget covers the whole frame, so the host page never sees a mismatch behind it.
 */
export function EmbedTheme({ theme, children }: { theme: EmbedTheme; children: ReactNode }) {
  return (
    <div
      className={cn("min-h-dvh bg-bg text-fg", theme === "light" ? "force-light" : "dark")}
      style={{ colorScheme: theme }}
    >
      {children}
    </div>
  );
}
