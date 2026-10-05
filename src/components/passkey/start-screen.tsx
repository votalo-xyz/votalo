"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { useCredential } from "../use-credential";
import { PasskeySetup } from "./passkey-setup";

/** Only same-site paths: "/create" yes, "//evil.test" and "https://..." no. */
export function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/groups";
}

export function StartScreen() {
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const credential = useCredential();

  if (credential === undefined) {
    return (
      <div className="flex flex-col gap-5" aria-busy="true">
        <Skeleton className="size-16 rounded-3xl" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-14 w-48 rounded-full" />
      </div>
    );
  }

  if (credential) {
    return (
      <div className="flex flex-col items-start gap-5">
        <span className="flex size-16 items-center justify-center rounded-3xl bg-success/15 text-success-text">
          <Check aria-hidden="true" className="size-9" strokeWidth={2.5} />
        </span>
        <h1 className="text-h2">{t("haveTitle")}</h1>
        <p className="text-lead text-muted">{t("haveBody")}</p>
        <Button size="lg" onClick={() => router.push(next)} className="w-full sm:w-auto">
          {t("continue")}
        </Button>
      </div>
    );
  }

  return <PasskeySetup onDone={() => router.push(next)} />;
}
