"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import type { Hex } from "viem";
import { createProposal } from "@/data/actions";
import { useGroupPage, useMemberAddress } from "@/data/hooks";
import { Link, useRouter } from "@/i18n/navigation";
import { classifyError, type ErrorKey } from "../errors";
import { PasskeySetup } from "../passkey/passkey-setup";
import { PrfUnavailable } from "../passkey/prf-unavailable";
import { ShellTitle } from "../shell/shell-title";
import { byteLength } from "../text";
import { Button, buttonVariants } from "../ui/button";
import { cn } from "../ui/cn";
import { Counter, Input, Textarea } from "../ui/input";
import { LoadError } from "../ui/load-error";
import { Skeleton } from "../ui/skeleton";
import { useCredential } from "../use-credential";

const MAX_TITLE = 140;
const MAX_OPTION = 40;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

const DURATIONS = [
  { key: "h1", seconds: 3600 },
  { key: "h24", seconds: 86_400 },
  { key: "d3", seconds: 3 * 86_400 },
  { key: "d7", seconds: 7 * 86_400 },
] as const;

type Option = { id: number; text: string };

export function NewProposalScreen({ groupId }: { groupId: Hex }) {
  const t = useTranslations("NewProposal");
  const e = useTranslations("Errors");
  const router = useRouter();
  const credential = useCredential();
  const member = useMemberAddress(groupId);
  const view = useGroupPage(groupId);
  const titleId = useId();
  const durationName = useId();

  const [title, setTitle] = useState("");
  const [options, setOptions] = useState<Option[]>([
    { id: 1, text: "" },
    { id: 2, text: "" },
  ]);
  const [nextId, setNextId] = useState(3);
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]["key"]>("h24");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);

  if (view.status === "error") return <LoadError onRetry={view.retry} />;
  if (view.status !== "ready" || credential === undefined || member === undefined) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  const group = view.data?.group;

  if (credential === null) {
    return (
      <div className="mx-auto max-w-xl pt-2">
        <PasskeySetup onDone={() => {}} />
      </div>
    );
  }

  if (!group || !member) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-start gap-4 pt-8">
        <h1 className="text-h2">{t("mustJoin")}</h1>
        <Link href={`/g/${groupId}`} className={cn(buttonVariants({ variant: "secondary" }), "mt-2")}>
          {t("goToGroup")}
        </Link>
      </div>
    );
  }

  if (error === "PRF_UNAVAILABLE") return <PrfUnavailable onRetry={() => setError(null)} />;

  const titleBytes = byteLength(title.trim());
  const filled = options.map((o) => o.text.trim());
  const typed = filled.filter((text) => text !== "").map((text) => text.toLowerCase());
  const hasDuplicates = new Set(typed).size !== typed.length;
  const optionsValid = filled.every((text) => byteLength(text) >= 1 && byteLength(text) <= MAX_OPTION) && !hasDuplicates;
  const valid = titleBytes >= 1 && titleBytes <= MAX_TITLE && optionsValid;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || !credential) return;
    setBusy(true);
    setError(null);
    try {
      const seconds = DURATIONS.find((d) => d.key === duration)!.seconds;
      const { proposalId } = await createProposal({
        credential,
        groupId,
        title: title.trim(),
        options: filled,
        deadlineSeconds: seconds,
      });
      router.push(`/g/${groupId}/p/${proposalId}?new=1`);
    } catch (err) {
      setError(classifyError(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto flex max-w-xl flex-col gap-8">
      <ShellTitle title={group.name} backHref={`/g/${groupId}`} />
      <h1 className="text-h2">{t("title")}</h1>

      <div className="flex flex-col gap-2">
        <label htmlFor={titleId} className="font-semibold">
          {t("questionLabel")}
        </label>
        <Textarea
          id={titleId}
          value={title}
          onChange={(ev) => setTitle(ev.target.value)}
          placeholder={t("questionPlaceholder")}
          rows={3}
          aria-describedby={`${titleId}-count`}
          aria-invalid={titleBytes > MAX_TITLE}
        />
        <div id={`${titleId}-count`} className="flex justify-end">
          <Counter text={t("questionCount", { count: titleBytes })} over={titleBytes > MAX_TITLE} />
        </div>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-semibold">{t("optionsLegend")}</legend>
        <p className="-mt-1 text-sm text-muted">{t("optionsHint")}</p>
        {options.map((option, i) => {
          const bytes = byteLength(option.text.trim());
          return (
            <div key={option.id} className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  value={option.text}
                  onChange={(ev) =>
                    setOptions((list) => list.map((o) => (o.id === option.id ? { ...o, text: ev.target.value } : o)))
                  }
                  aria-label={t("optionLabel", { n: i + 1 })}
                  placeholder={t("optionLabel", { n: i + 1 })}
                  autoComplete="off"
                  aria-invalid={bytes > MAX_OPTION}
                />
                {bytes > MAX_OPTION * 0.75 && (
                  <div className="mt-1 flex justify-end">
                    <Counter text={t("optionCount", { count: bytes })} over={bytes > MAX_OPTION} />
                  </div>
                )}
              </div>
              {options.length > MIN_OPTIONS && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("removeOption", { n: i + 1 })}
                  onClick={() => setOptions((list) => list.filter((o) => o.id !== option.id))}
                  className="mt-0.5"
                >
                  <X aria-hidden="true" className="size-5" />
                </Button>
              )}
            </div>
          );
        })}
        {hasDuplicates && (
          <p role="alert" className="text-sm font-medium text-danger">
            {t("duplicate")}
          </p>
        )}
        {options.length < MAX_OPTIONS && (
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setOptions((list) => [...list, { id: nextId, text: "" }]);
                setNextId((n) => n + 1);
              }}
            >
              <Plus aria-hidden="true" className="size-4" />
              {t("addOption")}
            </Button>
          </div>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-semibold">{t("durationLegend")}</legend>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {DURATIONS.map(({ key }) => (
            <label
              key={key}
              className={cn(
                "flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border px-3 text-center font-medium transition-[border-color,background-color] duration-200",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]",
                duration === key ? "border-fg bg-surface-2" : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <input
                type="radio"
                name={durationName}
                checked={duration === key}
                onChange={() => setDuration(key)}
                className="sr-only"
              />
              {t(`duration.${key}`)}
            </label>
          ))}
        </div>
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
