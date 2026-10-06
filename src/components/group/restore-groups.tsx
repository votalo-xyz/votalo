"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { classifyError, type ErrorKey } from "../errors";
import { PrfUnavailable } from "../passkey/prf-unavailable";
import { Button } from "../ui/button";
import { cn } from "../ui/cn";

type State =
  | { phase: "idle" }
  | { phase: "working"; done: number; total: number | null }
  | { phase: "none" }
  | { phase: "done"; added: number; total: number; partial: boolean }
  | { phase: "error"; key: ErrorKey };

/**
 * "Restore my groups": signs in with the passkey (this device may not know it yet), reads the encrypted list
 * and puts the groups back. Having no saved list is a normal answer, not an error. The vault code loads only
 * when the button is pressed, so pages that merely show the button stay light.
 */
export function RestoreGroups({
  title,
  compact = false,
  className,
  onRestored,
}: {
  /** The heading above the button; the compact form (inside the passkey screen) has none. */
  title?: "restoreTitle" | "restoreMeTitle";
  compact?: boolean;
  className?: string;
  /** Called once a restore has run, so the screen keeps this block (and its message) on view. */
  onRestored?: () => void;
}) {
  const t = useTranslations("Vault");
  const e = useTranslations("Errors");
  const [state, setState] = useState<State>({ phase: "idle" });
  const working = state.phase === "working";

  async function restore() {
    // Before the first group lands: each one changes the list, and a screen that shows this block only
    // while the list is empty would unmount it (and its result) mid-restore.
    onRestored?.();
    setState({ phase: "working", done: 0, total: null });
    try {
      const { restoreMyGroups } = await import("@/data/vault");
      const result = await restoreMyGroups((done, total) => setState({ phase: "working", done, total }));
      setState(result.status === "none" ? { phase: "none" } : { phase: "done", ...result });
    } catch (err) {
      setState({ phase: "error", key: classifyError(err) });
    }
  }

  if (state.phase === "error" && state.key === "PRF_UNAVAILABLE") {
    return <PrfUnavailable onRetry={() => setState({ phase: "idle" })} />;
  }

  const message =
    state.phase === "working"
      ? state.total === null
        ? t("restoring")
        : t("progress", { current: state.done + 1, total: state.total })
      : state.phase === "none"
        ? t("none")
        : state.phase === "done"
          ? state.partial
            ? t("partial", { done: state.added, total: state.total })
            : state.added > 0
              ? t("restored", { count: state.added })
              : t("upToDate")
          : null;

  const body = (
    <>
      {title && <h2 className="text-h3">{t(title)}</h2>}
      <p className={cn("text-muted", title && "mt-2", compact && "text-sm")}>{t("note")}</p>
      <Button
        variant={compact ? "secondary" : "primary"}
        size={compact ? "sm" : "md"}
        onClick={restore}
        disabled={working}
        className="mt-4 w-full sm:w-auto"
      >
        {t("restoreButton")}
      </Button>
      <p role="status" className={cn("mt-3 text-sm", message ? "text-fg" : "sr-only")}>
        {message}
      </p>
      {state.phase === "error" && (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          {e(state.key)}
        </p>
      )}
    </>
  );

  if (compact) return <div className={className}>{body}</div>;
  return <section className={cn("surface-card rounded-3xl p-5 sm:p-6", className)}>{body}</section>;
}
