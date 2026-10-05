"use client";

import { Check, LockKeyhole, Unlock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import type { Hex } from "viem";
import { createGroup } from "@/data/actions";
import type { GroupMode } from "@/data/types";
import { Link } from "@/i18n/navigation";
import { classifyError, type ErrorKey } from "../errors";
import { PasskeySetup } from "../passkey/passkey-setup";
import { PrfUnavailable } from "../passkey/prf-unavailable";
import { byteLength } from "../text";
import { Button, buttonVariants } from "../ui/button";
import { cn } from "../ui/cn";
import { Counter, Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";
import { useCredential } from "../use-credential";
import { InviteButton } from "./invite-button";

const MAX_NAME = 80;

export function CreateGroupScreen() {
  const t = useTranslations("Create");
  const e = useTranslations("Errors");
  const credential = useCredential();
  const nameId = useId();
  const modeName = useId();

  const [name, setName] = useState("");
  const [mode, setMode] = useState<GroupMode>("open");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [created, setCreated] = useState<{ id: Hex; name: string; mode: GroupMode } | null>(null);

  if (credential === undefined) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (credential === null) {
    return (
      <div className="mx-auto max-w-xl pt-2">
        <PasskeySetup onDone={() => {}} />
      </div>
    );
  }

  if (error === "PRF_UNAVAILABLE") return <PrfUnavailable onRetry={() => setError(null)} />;

  if (created) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-start gap-5 pt-4">
        <span className="flex size-16 items-center justify-center rounded-3xl bg-success/15 text-success-text">
          <Check aria-hidden="true" className="size-9" strokeWidth={2.5} />
        </span>
        <h1 className="text-h2">{t("doneTitle")}</h1>
        <p className="text-lead text-muted">
          <span className="font-semibold text-fg">{created.name}</span>. {t("doneBody")}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <InviteButton groupId={created.id} groupName={created.name} mode={created.mode} variant="primary" autoOpen />
          <Link href={`/g/${created.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
            {t("goToGroup")}
          </Link>
        </div>
      </div>
    );
  }

  const trimmed = name.trim();
  const bytes = byteLength(trimmed);
  const valid = bytes >= 1 && bytes <= MAX_NAME;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || !credential) return;
    setBusy(true);
    setError(null);
    try {
      const { groupId } = await createGroup({ credential, name: trimmed, mode });
      setCreated({ id: groupId, name: trimmed, mode });
    } catch (err) {
      setError(classifyError(err));
    } finally {
      setBusy(false);
    }
  }

  const modes: { value: GroupMode; icon: typeof Unlock; title: string; body: string; note: string }[] = [
    { value: "open", icon: Unlock, title: t("modeOpenTitle"), body: t("modeOpenBody"), note: t("modeOpenNote") },
    { value: "invite", icon: LockKeyhole, title: t("modeInviteTitle"), body: t("modeInviteBody"), note: t("modeInviteNote") },
  ];

  return (
    <form onSubmit={submit} className="mx-auto flex max-w-xl flex-col gap-8">
      <header>
        <h1 className="text-h2">{t("title")}</h1>
        <p className="mt-3 text-lead text-muted">{t("lead")}</p>
      </header>

      <div className="flex flex-col gap-2">
        <label htmlFor={nameId} className="font-semibold">
          {t("nameLabel")}
        </label>
        <Input
          id={nameId}
          value={name}
          onChange={(ev) => setName(ev.target.value)}
          placeholder={t("namePlaceholder")}
          autoComplete="off"
          enterKeyHint="done"
          aria-describedby={`${nameId}-count`}
          aria-invalid={bytes > MAX_NAME}
        />
        <div id={`${nameId}-count`} className="flex justify-end">
          <Counter text={t("nameCount", { count: bytes })} over={bytes > MAX_NAME} />
        </div>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-semibold">{t("modeLegend")}</legend>
        {modes.map(({ value, icon: Icon, title, body, note }) => {
          const checked = mode === value;
          return (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer gap-4 rounded-3xl border p-5 transition-[border-color,background-color] duration-200",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]",
                checked ? "border-fg bg-surface-2" : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <input
                type="radio"
                name={modeName}
                checked={checked}
                onChange={() => setMode(value)}
                className="sr-only"
              />
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-identity-soft text-identity">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span className="font-display text-lg font-semibold">{title}</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border",
                      checked ? "border-fg bg-fg text-bg" : "border-line-strong",
                    )}
                  >
                    {checked && <Check className="size-3.5" strokeWidth={3.5} />}
                  </span>
                </span>
                <span className="mt-1 block text-muted">{body}</span>
                {checked && <span className="mt-3 block text-sm text-muted">{note}</span>}
              </span>
            </label>
          );
        })}
      </fieldset>

      <div>
        <Button type="submit" size="lg" disabled={!valid || busy} className="w-full sm:w-auto">
          {busy ? t("creating") : t("submit")}
        </Button>
        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-danger">
            {e(error)}
          </p>
        )}
      </div>
    </form>
  );
}
