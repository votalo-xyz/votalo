"use client";

import { Check, Copy, Smartphone, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useState, useSyncExternalStore } from "react";
import { Button } from "../ui/button";

const noopSubscribe = () => () => {};
const currentUrl = () => window.location.href;

const SUPPORTED = ["ios", "android", "desktop", "windows"] as const;
const UNSUPPORTED = ["chromeLocal", "bitwarden", "dashlane"] as const;

/**
 * Shown when the browser cannot create the passkey type Votalo needs (Mera's PRF_UNAVAILABLE).
 * Explains it in plain words and offers a QR code of this same link for a phone.
 */
export function PrfUnavailable({ onRetry }: { onRetry?: () => void }) {
  const t = useTranslations("Prf");
  const c = useTranslations("Common");
  const url = useSyncExternalStore(noopSubscribe, currentUrl, () => "");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blocked: the link is still visible in the address bar.
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-identity-soft text-identity">
          <Smartphone aria-hidden="true" className="size-7" />
        </span>
        <div>
          <h1 className="text-h2 !text-[clamp(1.6rem,1.2rem+1.8vw,2.4rem)]">{t("title")}</h1>
          <p className="mt-3 text-lead text-muted">{t("body")}</p>
        </div>
      </div>

      <div className="surface-card flex flex-col items-center gap-5 rounded-3xl p-6 sm:flex-row sm:p-8">
        <div className="shrink-0 rounded-2xl bg-white p-3">
          {url ? (
            <QRCodeSVG value={url} size={168} level="M" bgColor="#ffffff" fgColor="#16131c" title={t("qrLabel")} />
          ) : (
            <div className="size-[168px]" />
          )}
        </div>
        <div className="min-w-0 text-center sm:text-left">
          <p className="font-semibold">{t("scan")}</p>
          <p className="mt-1 text-muted">{t("scanHint")}</p>
          <Button variant="secondary" size="sm" onClick={copy} className="mt-4">
            {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
            {copied ? c("copied") : c("copy")}
          </Button>
          <span role="status" className="sr-only">
            {copied ? c("copied") : ""}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-3xl border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Check aria-hidden="true" className="size-5 text-success-text" strokeWidth={3} />
            {t("works")}
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-[0.95rem] text-muted">
            {SUPPORTED.map((k) => (
              <li key={k}>{t(`supported.${k}`)}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-3xl border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <X aria-hidden="true" className="size-5 text-danger" strokeWidth={3} />
            {t("doesNot")}
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-[0.95rem] text-muted">
            {UNSUPPORTED.map((k) => (
              <li key={k}>{t(`unsupported.${k}`)}</li>
            ))}
          </ul>
        </section>
      </div>

      {onRetry && (
        <div>
          <Button variant="ghost" onClick={onRetry}>
            {c("tryAgain")}
          </Button>
        </div>
      )}
    </div>
  );
}
