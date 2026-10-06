"use client";

import { Fingerprint, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { createVotaloPasskey, type PasskeyCredential } from "@/lib/identity/passkey";
import { currentRpId } from "@/lib/identity/rpId";
import { classifyError, type ErrorKey } from "../errors";
import { RestoreGroups } from "../group/restore-groups";
import { Button } from "../ui/button";
import { storeCredential } from "../use-credential";
import { PrfUnavailable } from "./prf-unavailable";

type Phase = "idle" | "creating" | "unsupported";

/**
 * One screen, one button. Creates the member's passkey, saves it, and reports back.
 * Used on /start and inline wherever a vote needs a passkey first.
 */
export function PasskeySetup({
  onDone,
  inline = false,
}: {
  onDone: (credential: PasskeyCredential) => void;
  inline?: boolean;
}) {
  const t = useTranslations("Onboarding");
  const e = useTranslations("Errors");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<ErrorKey | null>(null);

  async function create() {
    setError(null);
    setPhase("creating");
    try {
      const credential = await createVotaloPasskey({ rpId: currentRpId(), displayName: t("displayName") });
      storeCredential(credential);
      onDone(credential);
    } catch (err) {
      const key = classifyError(err);
      if (key === "PRF_UNAVAILABLE") {
        setPhase("unsupported");
        return;
      }
      setError(key);
      setPhase("idle");
    }
  }

  if (phase === "unsupported") return <PrfUnavailable onRetry={() => setPhase("idle")} />;

  const Heading = inline ? "h2" : "h1";

  return (
    <div className="flex flex-col items-start gap-6">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-identity-soft text-identity">
        <Fingerprint aria-hidden="true" className="size-9" strokeWidth={1.5} />
      </span>
      <div>
        <Heading className={inline ? "text-h3" : "text-h2"}>{t("title")}</Heading>
        <p className="mt-3 text-lead text-muted">{t("body")}</p>
      </div>
      <div className="w-full">
        <Button size="lg" onClick={create} disabled={phase === "creating"} className="w-full sm:w-auto">
          {phase === "creating" ? t("creating") : t("button")}
        </Button>
        <p className="mt-3 text-sm text-muted" role="status">
          {phase === "creating" ? t("creatingHint") : t("hint")}
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-danger">
            {e(error)}
          </p>
        )}
      </div>
      <p className="flex items-center gap-2 text-sm text-muted">
        <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-success-text" />
        {t("privacy")}
      </p>
      {/* A synced passkey on a new device: signing in and restoring is the right step, not making a second passkey. */}
      {!inline && <RestoreGroups compact title="restoreTitle" className="w-full border-t border-line pt-6" />}
    </div>
  );
}
